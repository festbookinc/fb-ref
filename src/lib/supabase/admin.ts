import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!serviceRoleKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다. Supabase 대시보드 > Settings > API에서 service_role 키를 복사해 .env.local에 추가하세요."
  );
}

// 모듈 레벨 싱글턴: 동일 서버리스 인스턴스 내에서 클라이언트 재사용
const _adminClient = createClient(supabaseUrl, serviceRoleKey);

export function createAdminClient() {
  return _adminClient;
}
