-- FB Ref. 이미지 아카이브 - 초기 스키마
-- festbookinc@gmail.com Supabase 프로젝트에서 실행

-- 1. profiles: NextAuth 사용자 정보 동기화
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  image text,
  created_at timestamptz default now()
);

-- 2. images: 이미지 레퍼런스
create table if not exists images (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  link text,
  image_url text not null,
  user_id uuid references profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. tags: 태그
create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

-- 4. image_tags: 이미지-태그 다대다
create table if not exists image_tags (
  image_id uuid references images(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  primary key (image_id, tag_id)
);

-- 5. comments: 댓글
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  image_id uuid references images(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  content text not null,
  created_at timestamptz default now()
);

-- 6. boards: 보드 (폴더)
create table if not exists boards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now()
);

-- 7. board_images: 보드-이미지 다대다
create table if not exists board_images (
  board_id uuid references boards(id) on delete cascade,
  image_id uuid references images(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (board_id, image_id)
);

-- updated_at 자동 갱신 트리거
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger images_updated_at
  before update on images
  for each row execute function update_updated_at();

-- 인덱스 (검색/정렬 성능)
create index if not exists idx_images_user_id on images(user_id);
create index if not exists idx_images_created_at on images(created_at desc);
create index if not exists idx_image_tags_tag_id on image_tags(tag_id);
create index if not exists idx_comments_image_id on comments(image_id);
create index if not exists idx_boards_user_id on boards(user_id);
create index if not exists idx_board_images_board_id on board_images(board_id);
