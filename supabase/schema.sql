-- WorshipFlow database schema
-- Run in the Supabase SQL editor (or `supabase db push`).

-- ---------- Tables ----------

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default substring(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  created_at timestamptz not null default now()
);

create table if not exists team_members (
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default '',
  role text not null default 'member' check (role in ('leader', 'member')),
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table if not exists songs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  title text not null,
  artist text not null default '',
  default_key text not null default 'C',
  tempo int,
  chordpro text not null default '',
  spotify_track_id text,
  spotify_url text,
  youtube_video_id text,
  youtube_url text,
  album_art_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists setlists (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  title text not null,
  service_date date not null,
  notes text not null default '',
  spotify_playlist_id text,
  spotify_playlist_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists setlist_songs (
  id uuid primary key default gen_random_uuid(),
  setlist_id uuid not null references setlists(id) on delete cascade,
  song_id uuid not null references songs(id) on delete cascade,
  position int not null,
  selected_key text not null default 'C'
);

create index if not exists songs_team_idx on songs(team_id);
create index if not exists setlists_team_idx on setlists(team_id, service_date);
create index if not exists setlist_songs_setlist_idx on setlist_songs(setlist_id, position);

-- ---------- Helper ----------

create or replace function is_team_member(team uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from team_members
    where team_id = team and user_id = auth.uid()
  );
$$;

-- ---------- RLS ----------

alter table teams enable row level security;
alter table team_members enable row level security;
alter table songs enable row level security;
alter table setlists enable row level security;
alter table setlist_songs enable row level security;

create policy "members read team" on teams
  for select using (is_team_member(id));

create policy "members read members" on team_members
  for select using (is_team_member(team_id));

create policy "members manage songs" on songs
  for all using (is_team_member(team_id)) with check (is_team_member(team_id));

create policy "members manage setlists" on setlists
  for all using (is_team_member(team_id)) with check (is_team_member(team_id));

create policy "members manage setlist songs" on setlist_songs
  for all using (
    exists (select 1 from setlists s where s.id = setlist_id and is_team_member(s.team_id))
  ) with check (
    exists (select 1 from setlists s where s.id = setlist_id and is_team_member(s.team_id))
  );

-- ---------- Team onboarding RPCs ----------

-- Create a team and join it as leader. Returns the team.
create or replace function create_team(team_name text, display_name text default '')
returns setof teams
language plpgsql security definer
set search_path = public
as $$
declare
  new_team teams%rowtype;
begin
  insert into teams (name) values (team_name) returning * into new_team;
  insert into team_members (team_id, user_id, display_name, role)
    values (new_team.id, auth.uid(), create_team.display_name, 'leader');
  return next new_team;
end;
$$;

-- Join an existing team by invite code. Returns the team, or no rows if code invalid.
create or replace function join_team(invite text, display_name text default '')
returns setof teams
language plpgsql security definer
set search_path = public
as $$
declare
  found teams%rowtype;
begin
  select * into found from teams where invite_code = lower(trim(invite));
  if not found then
    return;
  end if;
  insert into team_members (team_id, user_id, display_name, role)
    values (found.id, auth.uid(), join_team.display_name, 'member')
    on conflict (team_id, user_id) do nothing;
  return next found;
end;
$$;

-- ---------- Spotify account connections (per-user OAuth) ----------

create table if not exists spotify_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  spotify_user_id text not null,
  spotify_display_name text not null default '',
  refresh_token text not null,
  scope text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table spotify_connections enable row level security;

-- Refresh tokens are sensitive: only the owning user can touch their row.
create policy "own connection only" on spotify_connections
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
