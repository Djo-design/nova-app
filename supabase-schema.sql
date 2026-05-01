-- ============================================================
-- NOVA by UFO GVNG — Schéma Supabase V1
-- Colle ce SQL dans : Supabase > SQL Editor > New Query
-- ============================================================

-- === EXTENSIONS ===
create extension if not exists "uuid-ossp";

-- === PROFILES ===
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  bio text,
  is_seed boolean default false,
  suspended_at timestamptz,
  created_at timestamptz default now()
);

-- === RÔLES ===
create table if not exists user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'artist', 'admin'))
);

-- Fonction sécurisée pour vérifier le rôle
create or replace function has_role(uid uuid, r text)
returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from user_roles where user_id = uid and role = r
  );
$$;

-- === PROFILS ARTISTES ===
create table if not exists artist_profiles (
  user_id uuid primary key references profiles(id) on delete cascade,
  full_bio text,
  genres text[],
  country text,
  created_at timestamptz default now()
);

-- === LIENS EXTERNES ARTISTES ===
create table if not exists artist_external_links (
  id uuid primary key default uuid_generate_v4(),
  artist_id uuid references profiles(id) on delete cascade,
  platform text not null check (platform in ('youtube_channel','spotify','deezer','tiktok','instagram','facebook','other')),
  url text not null,
  label text,
  sort_order int default 0
);

-- === VIDÉOS YOUTUBE ARTISTES ===
create table if not exists artist_youtube_videos (
  id uuid primary key default uuid_generate_v4(),
  artist_id uuid references profiles(id) on delete cascade,
  youtube_id text not null,
  title text,
  thumbnail_url text,
  added_at timestamptz default now(),
  sort_order int default 0
);

-- === TRACKS (audio interne) ===
create table if not exists tracks (
  id uuid primary key default uuid_generate_v4(),
  artist_id uuid references profiles(id) on delete cascade,
  title text not null,
  genre text,
  audio_url text not null,
  cover_url text,
  duration int, -- secondes
  plays int default 0,
  likes int default 0,
  is_seed boolean default false,
  deleted_at timestamptz,
  created_at timestamptz default now()
);

-- === VIDÉOS (interne) ===
create table if not exists videos (
  id uuid primary key default uuid_generate_v4(),
  artist_id uuid references profiles(id) on delete cascade,
  title text not null,
  genre text,
  video_url text not null,
  thumb_url text,
  duration int,
  views int default 0,
  likes int default 0,
  is_seed boolean default false,
  deleted_at timestamptz,
  created_at timestamptz default now()
);

-- === LIKES ===
create table if not exists likes (
  user_id uuid references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('track', 'video')),
  target_id uuid not null,
  created_at timestamptz default now(),
  primary key (user_id, target_type, target_id)
);

-- === PLAYS (écoutes) ===
create table if not exists plays (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  track_id uuid references tracks(id) on delete cascade,
  played_at timestamptz default now()
);

-- === VIEWS (vues vidéo) ===
create table if not exists views (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  video_id uuid references videos(id) on delete cascade,
  viewed_at timestamptz default now()
);

-- === FAVORIS ===
create table if not exists favorites (
  user_id uuid references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('track', 'video', 'artist')),
  target_id uuid not null,
  created_at timestamptz default now(),
  primary key (user_id, target_type, target_id)
);

-- === PLAYLISTS ===
create table if not exists playlists (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists playlist_tracks (
  playlist_id uuid references playlists(id) on delete cascade,
  track_id uuid references tracks(id) on delete cascade,
  sort_order int default 0,
  primary key (playlist_id, track_id)
);

-- === FOLLOWS ===
create table if not exists follows (
  follower_id uuid references auth.users(id) on delete cascade,
  artist_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, artist_id)
);

-- === SIGNALEMENTS ===
create table if not exists reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid references auth.users(id) on delete set null,
  target_type text not null check (target_type in ('track', 'video', 'profile')),
  target_id uuid not null,
  reason text,
  status text default 'pending' check (status in ('pending', 'ignored', 'resolved')),
  created_at timestamptz default now()
);

-- === NOTIFICATIONS ===
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  new_follower boolean default true,
  new_like boolean default true,
  new_content boolean default true
);

-- === ACTIONS ADMIN ===
create table if not exists admin_actions (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz default now()
);

-- === TABLES PRÉPARÉES V1.1 (créées vides) ===
create table if not exists subscription_plans (id uuid primary key default uuid_generate_v4(), name text, price numeric, interval text, created_at timestamptz default now());
create table if not exists subscriptions (id uuid primary key default uuid_generate_v4(), user_id uuid, plan_id uuid, starts_at timestamptz, ends_at timestamptz);
create table if not exists artist_subscriptions (id uuid primary key default uuid_generate_v4(), fan_id uuid, artist_id uuid, amount numeric, starts_at timestamptz);
create table if not exists tips (id uuid primary key default uuid_generate_v4(), sender_id uuid, artist_id uuid, amount numeric, created_at timestamptz default now());
create table if not exists promo_codes (id uuid primary key default uuid_generate_v4(), code text unique, discount numeric, expires_at timestamptz, used_count int default 0);
create table if not exists artist_perks (id uuid primary key default uuid_generate_v4(), artist_id uuid, perk_type text, granted_by uuid, granted_at timestamptz default now());

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

-- Activer RLS sur toutes les tables
alter table profiles enable row level security;
alter table user_roles enable row level security;
alter table artist_profiles enable row level security;
alter table artist_external_links enable row level security;
alter table artist_youtube_videos enable row level security;
alter table tracks enable row level security;
alter table videos enable row level security;
alter table likes enable row level security;
alter table plays enable row level security;
alter table views enable row level security;
alter table favorites enable row level security;
alter table playlists enable row level security;
alter table playlist_tracks enable row level security;
alter table follows enable row level security;
alter table reports enable row level security;
alter table notifications enable row level security;
alter table notification_preferences enable row level security;
alter table admin_actions enable row level security;

-- PROFILES : lecture publique, modification par soi-même ou admin
create policy "profiles_read" on profiles for select using (true);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);

-- USER_ROLES : lecture par soi-même, admin voit tout
create policy "roles_read_own" on user_roles for select using (auth.uid() = user_id or has_role(auth.uid(), 'admin'));
create policy "roles_insert_own" on user_roles for insert with check (auth.uid() = user_id);

-- TRACKS : lecture publique (non supprimés), upload par artiste
create policy "tracks_read" on tracks for select using (deleted_at is null);
create policy "tracks_insert_artist" on tracks for insert with check (has_role(auth.uid(), 'artist') or has_role(auth.uid(), 'admin'));
create policy "tracks_update_own" on tracks for update using (artist_id = auth.uid() or has_role(auth.uid(), 'admin'));

-- VIDEOS : lecture publique
create policy "videos_read" on videos for select using (deleted_at is null);
create policy "videos_insert_artist" on videos for insert with check (has_role(auth.uid(), 'artist') or has_role(auth.uid(), 'admin'));
create policy "videos_update_own" on videos for update using (artist_id = auth.uid() or has_role(auth.uid(), 'admin'));

-- LIKES : lecture publique, modification par propriétaire
create policy "likes_read" on likes for select using (true);
create policy "likes_write" on likes for all using (auth.uid() = user_id);

-- PLAYS / VIEWS : insert par authentifié
create policy "plays_insert" on plays for insert with check (auth.uid() = user_id);
create policy "plays_read_own" on plays for select using (auth.uid() = user_id);
create policy "views_insert" on views for insert with check (auth.uid() = user_id);
create policy "views_read_own" on views for select using (auth.uid() = user_id);

-- FAVORITES : par propriétaire
create policy "favorites_all" on favorites for all using (auth.uid() = user_id);

-- PLAYLISTS : par propriétaire
create policy "playlists_all" on playlists for all using (auth.uid() = user_id);
create policy "playlist_tracks_all" on playlist_tracks for all using (
  exists (select 1 from playlists where id = playlist_id and user_id = auth.uid())
);

-- FOLLOWS : lecture publique, action par authentifié
create policy "follows_read" on follows for select using (true);
create policy "follows_write" on follows for all using (auth.uid() = follower_id);

-- REPORTS : insert par authentifié, lecture par admin
create policy "reports_insert" on reports for insert with check (auth.uid() = reporter_id);
create policy "reports_admin" on reports for select using (has_role(auth.uid(), 'admin'));

-- NOTIFICATIONS : par propriétaire
create policy "notifs_own" on notifications for all using (auth.uid() = user_id);
create policy "notif_prefs_own" on notification_preferences for all using (auth.uid() = user_id);

-- ADMIN ACTIONS : admin seulement
create policy "admin_actions_only" on admin_actions for all using (has_role(auth.uid(), 'admin'));

-- ARTIST LINKS / YOUTUBE : lecture publique, écriture par artiste propriétaire
create policy "ext_links_read" on artist_external_links for select using (true);
create policy "ext_links_write" on artist_external_links for all using (artist_id = auth.uid() or has_role(auth.uid(), 'admin'));
create policy "yt_videos_read" on artist_youtube_videos for select using (true);
create policy "yt_videos_write" on artist_youtube_videos for all using (artist_id = auth.uid() or has_role(auth.uid(), 'admin'));

-- ============================================================
-- STORAGE BUCKETS
-- (à créer dans Supabase > Storage > New Bucket)
-- ============================================================
-- audio   → public: true
-- video   → public: true
-- covers  → public: true
-- avatars → public: true

-- ============================================================
-- PREMIER ADMIN
-- Remplace 'ton-user-id' par ton vrai UUID (visible dans Auth > Users)
-- ============================================================
-- update user_roles set role = 'admin' where user_id = 'ton-user-id';

-- ============================================================
-- FIN DU SCHÉMA
-- ============================================================
