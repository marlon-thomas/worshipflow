// Supabase Edge Function: spotify-auth
// Handles the leader's Spotify "Connect" flow.
//
// Routes:
//   POST {action:'start'}      (user JWT required) -> { url } Spotify authorize URL
//   POST {action:'status'}     (user JWT required) -> { connected, spotifyDisplayName? }
//   POST {action:'disconnect'} (user JWT required) -> deletes the connection
//   GET ?code&state            (Spotify redirect target, NO JWT) -> exchanges code,
//                                stores the connection, shows a "success" HTML page.
//
// state carries the Supabase user id (UUIDs are unguessable; the write only ever
// stores a connection for that user id). Deploy with verify_jwt = false so the
// GET redirect reaches us.
//
// Secrets: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SCOPE = 'playlist-modify-public';

function sbUrl(): string {
  return Deno.env.get('SUPABASE_URL')!;
}

function publishableKey(): string {
  const json = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  if (json) return JSON.parse(json).default;
  return Deno.env.get('SUPABASE_ANON_KEY')!;
}

function serviceKey(): string {
  const json = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (json) return JSON.parse(json).default;
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
}

function redirectUri(): string {
  return `${sbUrl()}/functions/v1/spotify-auth`;
}

/** Resolve the calling user from the request's JWT. */
async function getUser(req: Request) {
  const auth = req.headers.get('Authorization');
  if (!auth) return null;
  const client = createClient(sbUrl(), publishableKey(), {
    global: { headers: { Authorization: auth } },
  });
  const { data, error } = await client.auth.getUser();
  return error || !data.user ? null : data.user;
}

function authorizeUrl(userId: string): string {
  const u = new URL('https://accounts.spotify.com/authorize');
  u.searchParams.set('client_id', Deno.env.get('SPOTIFY_CLIENT_ID')!);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('redirect_uri', redirectUri());
  u.searchParams.set('scope', SCOPE);
  u.searchParams.set('state', userId);
  return u.toString();
}

async function exchangeCode(code: string) {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${Deno.env.get('SPOTIFY_CLIENT_ID')}:${Deno.env.get('SPOTIFY_CLIENT_SECRET')}`)}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(),
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  return await res.json() as { access_token: string; refresh_token: string; scope: string };
}

function htmlPage(title: string, body: string, ok: boolean): Response {
  const color = ok ? '#1DB954' : '#d64545';
  return new Response(
    `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
     <body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:90vh;margin:0;background:#0c0c0c;color:#eee">
     <div style="max-width:340px;text-align:center">
       <div style="font-size:48px;color:${color}">${ok ? '✓' : '✕'}</div>
       <h1 style="font-size:20px">${title}</h1>
       <p style="color:#aaa">${body}</p>
     </div></body>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // --- Spotify redirect callback (no JWT) ---
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const userId = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    if (error) return htmlPage('Connection cancelled', 'You can close this tab.', false);
    if (!code || !userId) return htmlPage('Invalid request', 'Missing code or state.', false);

    try {
      const tokens = await exchangeCode(code);
      const profileRes = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (!profileRes.ok) throw new Error(`Profile fetch failed: ${profileRes.status}`);
      const profile = await profileRes.json();

      const admin = createClient(sbUrl(), serviceKey());
      const { data: membership } = await admin
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();
      if (!membership) return htmlPage('No team', 'Join a team in WorshipFlow first, then connect Spotify.', false);

      const { error: upsertError } = await admin.from('spotify_connections').upsert({
        user_id: userId,
        team_id: membership.team_id,
        spotify_user_id: profile.id,
        spotify_display_name: profile.display_name ?? profile.id,
        refresh_token: tokens.refresh_token,
        scope: tokens.scope,
        updated_at: new Date().toISOString(),
      });
      if (upsertError) throw upsertError;

      return htmlPage('Spotify connected', `Linked to ${profile.display_name ?? profile.id}. You can close this and return to WorshipFlow.`, true);
    } catch (err) {
      return htmlPage('Connection failed', String(err), false);
    }
  }

  // --- App calls (JWT required) ---
  try {
    const user = await getUser(req);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }
    const { action } = await req.json();
    const admin = createClient(sbUrl(), serviceKey());

    if (action === 'start') {
      return Response.json({ url: authorizeUrl(user.id) }, { headers: corsHeaders });
    }
    if (action === 'status') {
      const { data } = await admin
        .from('spotify_connections')
        .select('spotify_display_name')
        .eq('user_id', user.id)
        .maybeSingle();
      return Response.json({ connected: !!data, spotifyDisplayName: data?.spotify_display_name ?? null }, { headers: corsHeaders });
    }
    if (action === 'disconnect') {
      await admin.from('spotify_connections').delete().eq('user_id', user.id);
      return Response.json({ ok: true }, { headers: corsHeaders });
    }
    return Response.json({ error: 'Unknown action' }, { status: 400, headers: corsHeaders });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500, headers: corsHeaders });
  }
});
