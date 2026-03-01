# Supabase 설정 가이드 (festbookinc@gmail.com)

## 1. Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com) 접속
2. **festbookinc@gmail.com** 계정으로 로그인
3. **New Project** 클릭
4. 다음 정보 입력:
   - **Name**: `fb-ref` (또는 원하는 이름)
   - **Database Password**: 안전한 비밀번호 설정 (저장해 두세요)
   - **Region**: `Northeast Asia (Seoul)` 권장
5. **Create new project** 클릭 (생성에 1~2분 소요)

## 2. API 키 확인

1. 프로젝트 대시보드 → **Settings** (왼쪽 하단 톱니바퀴)
2. **API** 메뉴 클릭
3. 다음 값 복사:
   - **Project URL** (예: `https://xxxxxxxx.supabase.co`)
   - **anon public** 키 (Public 키)
   - **service_role** 키 (비밀 키 - 노출 주의)

## 3. 환경 변수 설정

1. 프로젝트 루트에 `.env.local` 파일 생성
2. 아래 내용 입력 (실제 값으로 교체):

```
NEXT_PUBLIC_SUPABASE_URL=여기에_Project_URL_붙여넣기
NEXT_PUBLIC_SUPABASE_ANON_KEY=여기에_anon_키_붙여넣기
SUPABASE_SERVICE_ROLE_KEY=여기에_service_role_키_붙여넣기
```

> **service_role** 키는 서버에서만 사용합니다. 클라이언트에 노출하지 마세요.

3. 파일 저장

## 4. DB 스키마 적용

1. Supabase 대시보드 → **SQL Editor** 메뉴
2. `supabase/migrations/001_initial_schema.sql` 파일 내용 복사 후 **Run** 실행
3. `supabase/migrations/002_storage_bucket.sql` 파일 내용 복사 후 **Run** 실행

(또는 Supabase CLI 설치 후 `supabase db push` 사용)

## 5. 확인

개발 서버 실행 후 에러가 없으면 설정 완료입니다.

```bash
npm run dev
```
