-- Storage 버킷 생성 (이미지 업로드용)
-- 대시보드에서 실행하거나, Supabase CLI 사용 시 적용

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'images',
  'images',
  true,
  10485760,  -- 10MB
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do nothing;

-- 공개 읽기 정책 (이미지 URL로 접근 가능)
create policy "Public read access for images"
on storage.objects for select
using (bucket_id = 'images');

-- 업로드/수정/삭제 정책 (Phase 2 인증 적용 후 auth.uid() 등으로 제한 예정)
create policy "Allow uploads for images bucket"
on storage.objects for insert
with check (bucket_id = 'images');

create policy "Allow updates for images bucket"
on storage.objects for update
using (bucket_id = 'images');

create policy "Allow deletes for images bucket"
on storage.objects for delete
using (bucket_id = 'images');
