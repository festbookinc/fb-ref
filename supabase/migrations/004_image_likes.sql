-- 좋아요 기능: image_likes 테이블
-- Supabase SQL Editor에서 실행

create table if not exists image_likes (
  image_id uuid not null references images(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (image_id, user_id)
);

create index if not exists idx_image_likes_image_id on image_likes(image_id);
create index if not exists idx_image_likes_user_id on image_likes(user_id);
