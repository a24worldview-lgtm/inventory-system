-- Stock Master（在庫チェックアプリ）用のテーブル
-- Supabase の SQL Editor に貼り付けて「Run」で実行する。何度実行しても壊れない。

-- 施設ごとに1行。複数人が別々の施設をチェックしても、お互いの変更を上書きしないよう施設単位に分けている
create table if not exists public.sm_facilities (
  id text primary key,
  position integer not null default 0,         -- ホーム画面での並び順
  data jsonb not null,                         -- 施設名・場所・品目・在庫の状態
  updated_at timestamptz not null default now()
);

-- アプリ全体で1行だけ：購入先リストと、買い物リストの「買った」チェック
create table if not exists public.sm_settings (
  id text primary key default 'main',
  shops jsonb not null default '[]'::jsonb,
  purchased jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- 今はログイン無しで使うため、アプリからの読み書きをすべて許可する。
-- 将来ログインを付けるときは、このポリシーを「ログインした人だけ」に差し替える。
alter table public.sm_facilities enable row level security;
alter table public.sm_settings enable row level security;

drop policy if exists "app can read and write" on public.sm_facilities;
create policy "app can read and write" on public.sm_facilities
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "app can read and write" on public.sm_settings;
create policy "app can read and write" on public.sm_settings
  for all to anon, authenticated using (true) with check (true);

-- 誰かが更新したら、ほかの人の画面にもすぐ反映されるようにする（リアルタイム配信）
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'sm_facilities') then
    alter publication supabase_realtime add table public.sm_facilities;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'sm_settings') then
    alter publication supabase_realtime add table public.sm_settings;
  end if;
end $$;
