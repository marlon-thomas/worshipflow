export interface Team {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
}

export interface TeamMember {
  team_id: string;
  user_id: string;
  display_name: string;
  role: 'leader' | 'member';
  created_at: string;
}

export interface Song {
  id: string;
  team_id: string;
  title: string;
  artist: string;
  default_key: string;
  tempo: number | null;
  chordpro: string;
  spotify_track_id: string | null;
  spotify_url: string | null;
  youtube_video_id: string | null;
  youtube_url: string | null;
  album_art_url: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Setlist {
  id: string;
  team_id: string;
  title: string;
  service_date: string; // ISO date
  notes: string;
  spotify_playlist_id: string | null;
  spotify_playlist_url: string | null;
  created_by: string | null;
  created_at: string;
}

export interface SetlistSong {
  id: string;
  setlist_id: string;
  song_id: string;
  position: number;
  selected_key: string;
}
