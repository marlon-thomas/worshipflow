// Supabase Edge Function: spotify-playlist
// Creates or updates a Spotify playlist mirroring a setlist, using the
// CALLER's connected Spotify account (the leader who connected).
//
// POST { setlist_id } -> { url, trackCount }
//
// Requires the caller to have a spotify_connections row (via spotify-auth).
// Secrets: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function sbUrl(): string {
  return Deno.env.get('SUPABASE_URL')!;
}

function publishableKey(): string {
  const json = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  if (json) return JSON.parse(json).default;
  return Deno.env.get('SUPABASE_ANON_KEY')!;
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${Deno.env.get('SPOTIFY_CLIENT_ID')}:${Deno.env.get('SPOTIFY_CLIENT_SECRET')}`)}`,
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  });
  if (!res.ok) throw new Error(`Spotify token refresh failed (${res.status}). Reconnect Spotify in the app.`);
  const json = await res.json();
  return json.access_token;
}

async function spotifyFetch(accessToken: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  return res;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  try {
    // DB access as the caller (RLS enforces team membership).
    const supa = createClient(sbUrl(), publishableKey(), {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supa.auth.getUser();
    if (!userData.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const { setlist_id } = await req.json();
    if (!setlist_id) {
      return Response.json({ error: 'Missing setlist_id' }, { status: 400, headers: corsHeaders });
    }

    // Load setlist + ordered songs (RLS-checked).
    const { data: setlist, error: setlistErr } = await supa
      .from('setlists')
      .select('*')
      .eq('id', setlist_id)
      .single();
    if (setlistErr || !setlist) throw new Error('Setlist not found or not accessible');

    const { data: items } = await supa
      .from('setlist_songs')
      .select('position, songs(spotify_track_id, title)')
      .eq('setlist_id', setlist_id)
      .order('position', { ascending: true });

    const trackUris = (items ?? [])
      .map((i: any) => i.songs?.spotify_track_id)
      .filter(Boolean)
      .map((id: string) => `spotify:track:${id}`);

    if (trackUris.length === 0) {
      return Response.json(
        { error: 'No songs in this setlist are linked to Spotify tracks. Add songs with the Spotify search first.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Caller must have connected their own Spotify account.
    const { data: connection } = await supa
      .from('spotify_connections')
      .select('refresh_token')
      .eq('user_id', userData.user.id)
      .maybeSingle();
    if (!connection) {
      return Response.json(
        { error: 'No Spotify account connected. Open the Team tab and tap "Connect Spotify" first.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const accessToken = await refreshAccessToken(connection.refresh_token);

    const name = `${setlist.title} — ${setlist.service_date}`;
    const description = 'Created by WorshipFlow. Keys & lyric sheets are in the app.';

    let playlistId: string | null = setlist.spotify_playlist_id ?? null;
    let playlistUrl: string | null = setlist.spotify_playlist_url ?? null;
    let created = false;

    if (playlistId) {
      // Update existing playlist: rename + replace items.
      const meta = await spotifyFetch(accessToken, `/playlists/${playlistId}`, {
        method: 'PUT',
        body: JSON.stringify({ name, description }),
      });
      if (meta.status === 404 || meta.status === 403) playlistId = null; // playlist deleted or owner changed -> recreate
      else if (!meta.ok) throw new Error(`Playlist rename failed: ${meta.status} ${await meta.text()}`);
    }

    if (!playlistId) {
      const createRes = await spotifyFetch(accessToken, '/me/playlists', {
        method: 'POST',
        body: JSON.stringify({ name, public: true, description }),
      });
      if (!createRes.ok) throw new Error(`Playlist create failed: ${createRes.status} ${await createRes.text()}`);
      const createdPlaylist = await createRes.json();
      playlistId = createdPlaylist.id;
      playlistUrl = createdPlaylist.external_urls?.spotify ?? `https://open.spotify.com/playlist/${playlistId}`;
      created = true;
    }

    const itemsRes = await spotifyFetch(accessToken, `/playlists/${playlistId}/items`, {
      method: created ? 'POST' : 'PUT', // PUT replaces all items on existing playlists
      body: JSON.stringify({ uris: trackUris }),
    });
    if (!itemsRes.ok) throw new Error(`Syncing tracks failed: ${itemsRes.status} ${await itemsRes.text()}`);

    await supa
      .from('setlists')
      .update({ spotify_playlist_id: playlistId, spotify_playlist_url: playlistUrl })
      .eq('id', setlist_id);

    return Response.json({ url: playlistUrl, trackCount: trackUris.length }, { headers: corsHeaders });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500, headers: corsHeaders });
  }
});
