-- ============================================================
-- NOVA — SQL Patch : fonctions likes + plays
-- Colle dans Supabase > SQL Editor > New Query
-- ============================================================

-- Incrémenter les likes d'une track
create or replace function increment_likes(row_id uuid, table_name text)
returns void language plpgsql security definer as $$
begin
  if table_name = 'tracks' then
    update tracks set likes = likes + 1 where id = row_id;
  elsif table_name = 'videos' then
    update videos set likes = likes + 1 where id = row_id;
  end if;
end;
$$;

-- Décrémenter les likes
create or replace function decrement_likes(row_id uuid, table_name text)
returns void language plpgsql security definer as $$
begin
  if table_name = 'tracks' then
    update tracks set likes = greatest(0, likes - 1) where id = row_id;
  elsif table_name = 'videos' then
    update videos set likes = greatest(0, likes - 1) where id = row_id;
  end if;
end;
$$;

-- Incrémenter les plays d'une track (anti-triche géré côté client)
create or replace function increment_plays(row_id uuid)
returns void language plpgsql security definer as $$
begin
  update tracks set plays = plays + 1 where id = row_id;
end;
$$;

-- Incrémenter les vues d'une vidéo
create or replace function increment_views(row_id uuid)
returns void language plpgsql security definer as $$
begin
  update videos set views = views + 1 where id = row_id;
end;
$$;

-- ============================================================
-- STORAGE POLICIES (si pas déjà faites)
-- ============================================================

-- Bucket audio : upload par artiste authentifié
insert into storage.buckets (id, name, public) values ('audio', 'audio', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('video', 'video', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('covers', 'covers', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;

-- Policies storage
create policy "audio_read" on storage.objects for select using (bucket_id = 'audio');
create policy "audio_upload" on storage.objects for insert with check (bucket_id = 'audio' and auth.role() = 'authenticated');
create policy "audio_delete_own" on storage.objects for delete using (bucket_id = 'audio' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "video_read" on storage.objects for select using (bucket_id = 'video');
create policy "video_upload" on storage.objects for insert with check (bucket_id = 'video' and auth.role() = 'authenticated');
create policy "video_delete_own" on storage.objects for delete using (bucket_id = 'video' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "covers_read" on storage.objects for select using (bucket_id = 'covers');
create policy "covers_upload" on storage.objects for insert with check (bucket_id = 'covers' and auth.role() = 'authenticated');

create policy "avatars_read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars_upload" on storage.objects for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
create policy "avatars_update_own" on storage.objects for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
