-- 검색 RPC: 한글 ilike 검색 (PostgREST URL 인코딩 이슈 회피)
-- NFC 정규화로 입력/저장 유니코드 형태 차이(NFC vs NFD) 해결 → 부분 검색 안정화
-- Supabase SQL Editor에서 실행 후 search_images('부동산') 호출로 검색

create or replace function search_images(search_query text)
returns table(image_id uuid) as $$
declare
  pattern text;
  q text;
  nfc text := chr(78)||chr(70)||chr(67);
begin
  if search_query is null or trim(search_query) = '' then
    return;
  end if;
  q := normalize(trim(search_query), nfc);
  pattern := '%' || q || '%';

  return query
  select distinct id from (
    select i.id from images i
      where coalesce(normalize(i.title, nfc), '') ilike pattern
         or coalesce(normalize(i.description, nfc), '') ilike pattern
    union
    select it.image_id from image_tags it join tags t on t.id = it.tag_id
      where coalesce(normalize(t.name, nfc), '') ilike pattern
    union
    select i.id from images i join profiles p on p.id = i.user_id
      where coalesce(normalize(p.name, nfc), '') ilike pattern
         or coalesce(normalize(p.email, nfc), '') ilike pattern
    union
    select c.image_id from comments c
      where coalesce(normalize(c.content, nfc), '') ilike pattern
  ) sub(id);
end;
$$ language plpgsql security definer;
