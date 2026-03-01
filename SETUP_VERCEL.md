# Vercel 배포 설정 (FB Ref.)

> GitHub(festbookinc) 저장소에 푸시한 뒤 Vercel에서 배포합니다.

---

## 1. GitHub 푸시

이미 `git push -u origin main`으로 한 번 푸시했다면, 이후에는 변경 사항 커밋 후 **`git push`만** 실행하면 됩니다.

```bash
git add .
git commit -m "커밋 메시지"
git push
```

처음 푸시하는 경우:
```bash
git push -u origin main
```

---

## 2. Vercel 프로젝트 생성

1. [vercel.com](https://vercel.com) 접속
2. **사용할 Vercel 계정**으로 로그인 (GitHub 연동 권장)
3. **Add New** → **Project**
4. **Import Git Repository**에서 `festbookinc/fb-ref` (또는 해당 저장소) 선택
5. **Framework Preset**: Next.js (자동 감지)
6. **Root Directory**: `./` (기본값)
7. **Build Command**: `next build` (기본값)
8. **Output Directory**: `.next` (기본값)

---

## 3. 환경 변수 설정

### 찾는 방법

1. [vercel.com/dashboard](https://vercel.com/dashboard) 접속
2. **프로젝트 이름(fb-ref 등)** 클릭
3. 상단 탭에서 **Settings** 클릭
4. 왼쪽 사이드바에서 **Environment Variables** 클릭  
   (스크롤이 필요할 수 있음. General, Domains 아래에 있음)

**또는** 프로젝트를 처음 Import할 때 **Configure Project** 화면에서 **Environment Variables** 섹션이 보이면 그때 추가해도 됩니다.

### 방법 1: 일괄 붙여넣기 (권장)

로컬 `.env.local` 내용을 복사한 뒤, Vercel 환경 변수 화면에서 **붙여넣기(Ctrl+V)** 하면 자동으로 여러 값이 한 번에 들어갑니다.

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
AUTH_SECRET=...
AUTH_GOOGLE_ID=xxx.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=...
ALLOWED_EMAILS=festbookinc@gmail.com
ALLOWED_EMAIL_DOMAINS=festbook.co.kr
```

또는 **Import** 버튼으로 `.env` 파일을 업로드해도 됩니다.

### 방법 2: 하나씩 입력

| 변수명 | 설명 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key |
| `AUTH_SECRET` | NextAuth 시크릿 (`npx auth secret` 실행 결과) |
| `AUTH_GOOGLE_ID` | Google OAuth 클라이언트 ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth 시크릿 |
| `ALLOWED_EMAILS` | 허용 이메일 (쉼표 구분) |
| `ALLOWED_EMAIL_DOMAINS` | 허용 도메인 (쉼표 구분) |

**Production, Preview, Development** 모두에 적용하거나, Production만 설정해도 됩니다.

---

## 4. Google OAuth 리디렉션 URI 추가

Vercel 배포 후 생성되는 URL(예: `https://fb-ref.vercel.app`)을 Google Cloud Console에 등록해야 합니다.

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → OAuth 2.0 클라이언트 ID
2. **승인된 리디렉션 URI**에 추가:
   - `https://프로젝트주소.vercel.app/api/auth/callback/google`
3. 저장

---

## 5. 배포

1. **Deploy** 클릭
2. 빌드 완료 후 `https://프로젝트주소.vercel.app`에서 확인

이후 `main` 브랜치에 푸시할 때마다 자동으로 재배포됩니다.
