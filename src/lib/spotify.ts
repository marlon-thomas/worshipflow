/**
 * Leader-facing Spotify account connection + playlist sync,
 * driven by the spotify-auth / spotify-playlist edge functions.
 */

import { supabase } from './supabase';

export interface SpotifyStatus {
  connected: boolean;
  spotifyDisplayName: string | null;
}

async function invoke(name: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export function spotifyStatus(): Promise<SpotifyStatus> {
  return invoke('spotify-auth', { action: 'status' });
}

/** URL of Spotify's own consent page — open it in the system browser. */
export function spotifyStartUrl(): Promise<{ url: string }> {
  return invoke('spotify-auth', { action: 'start' });
}

export function spotifyDisconnect(): Promise<{ ok: boolean }> {
  return invoke('spotify-auth', { action: 'disconnect' });
}

export interface PlaylistSyncResult {
  url: string;
  trackCount: number;
}

export function syncSetlistPlaylist(setlistId: string): Promise<PlaylistSyncResult> {
  return invoke('spotify-playlist', { setlist_id: setlistId });
}
