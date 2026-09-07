/**
 * Spotify & YouTube search, proxied through Supabase Edge Functions
 * so API secrets never ship in the app.
 */

import { supabase } from './supabase';

export interface SpotifyCandidate {
  id: string;
  name: string;
  artists: string;
  album: string;
  imageUrl: string | null;
  durationMs: number;
  url: string;
}

export interface YouTubeCandidate {
  id: string;
  title: string;
  channel: string;
  thumbnailUrl: string | null;
  url: string;
}

export async function searchSpotify(query: string): Promise<SpotifyCandidate[]> {
  const { data, error } = await supabase.functions.invoke('spotify-search', {
    body: { query },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return (data?.results ?? []) as SpotifyCandidate[];
}

export async function searchYouTube(query: string): Promise<YouTubeCandidate[]> {
  const { data, error } = await supabase.functions.invoke('youtube-search', {
    body: { query },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return (data?.results ?? []) as YouTubeCandidate[];
}
