# Vercel 배포 설정 (FB Ref.)

> GitHub(festbookinc) 저장소에 푸시한 뒤 Vercel에서 배포합니다.

---

## 1. GitHub 푸시

**사용할 GitHub 계정을 확인한 뒤** 아래를 실행하세요. (예: festbookinc)

```bash
# 변경 사항 스테이징 및 커밋
git add .
git commit -m "Phase 8: 모션 인터랙션 및 Vercel 배포 준비"

# 원격 저장소로 푸시 (origin이 festbookinc/fb-ref 등으로 설정되어 있어야 함)
git push -u origin main
```

원격 URL 확인:
```bash
git remote -v
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

Vercel 대시보드 → 프로젝트 → **Settings** → **Environment Variables**에서 아래 변수를 추가하세요.

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | `eyJ...` |
| `AUTH_SECRET` | NextAuth 시크릿 | `npx auth secret` 실행 결과 |
| `AUTH_GOOGLE_ID` | Google OAuth 클라이언트 ID | `xxx.apps.googleusercontent.com` |
| `AUTH_GOOGLE_SECRET` | Google OAuth 시크릿 | |
| `ALLOWED_EMAILS` | 허용 이메일 (쉼표 구분) | `festbookinc@gmail.com` |
| `ALLOWED_EMAIL_DOMAINS` | 허용 도메인 (쉼표 구분) | `festbook.co.kr` |

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
