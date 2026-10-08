-- Stock Master：写真置き場（置き方の見本写真など）
-- Supabase の SQL Editor に貼り付けて「Run」で実行する。何度実行しても壊れない。

-- 写真置き場（バケット）。写真はURLで表示するので公開読み取りにする。
-- 1枚5MBまで・画像だけ受け付ける（アプリ側で小さくしてから送るので、実際は数百KB）
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sm-photos', 'sm-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 今はログイン無しで使うため、アプリからの読み取り・追加・削除を許可する。
-- 将来ログインを付けるときは「ログインした人だけ」に差し替える。
drop policy if exists "sm-photos read" on storage.objects;
create policy "sm-photos read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'sm-photos');

drop policy if exists "sm-photos upload" on storage.objects;
create policy "sm-photos upload" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'sm-photos');

drop policy if exists "sm-photos delete" on storage.objects;
create policy "sm-photos delete" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'sm-photos');
