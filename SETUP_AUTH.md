# NextAuth Google 로그인 설정 가이드

> Google Cloud Console **한글** 기준 안내입니다.  
> 언어 변경: 콘솔 우측 상단 ⚙️ → **언어** → 한국어

---

## 1. Google Cloud Console 접속

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. **festbookinc@gmail.com** 계정으로 로그인

---

## 2. 프로젝트 선택 또는 생성

1. 상단 프로젝트 선택 드롭다운 클릭
2. **새 프로젝트** 클릭 (또는 기존 프로젝트 선택)
3. 프로젝트 이름: `FB Ref` (또는 원하는 이름)
4. **만들기** 클릭

---

## 3. OAuth 동의 화면 설정 (최초 1회)

OAuth 클라이언트를 만들기 전에 동의 화면을 먼저 설정해야 합니다.

1. 왼쪽 메뉴 **☰** → **API 및 서비스** → **OAuth 동의 화면**
2. **외부** 선택 → **만들기** 클릭
3. **앱 정보** 입력:
   - **앱 이름**: `FB Ref`
   - **사용자 지원 이메일**: 본인 이메일 선택
   - **개발자 연락처 정보**: 이메일 입력
4. **저장 후 계속** 클릭
5. **범위** 화면에서 **저장 후 계속** 클릭 (기본 범위로 충분)
6. **테스트 사용자** (선택): 테스트 모드일 때 로그인 허용할 이메일 추가
7. **저장 후 계속** → **대시보드로 돌아가기**

---

## 4. OAuth 클라이언트 ID 생성

1. 왼쪽 메뉴 **☰** → **API 및 서비스** → **사용자 인증 정보**
2. 상단 **+ 사용자 인증 정보 만들기** 클릭
3. **OAuth 클라이언트 ID** 선택
4. **애플리케이션 유형**: **웹 애플리케이션** 선택
5. **이름**: `FB Ref 웹` (또는 원하는 이름)
6. **승인된 JavaScript 원본** (선택):
   - 개발: `http://localhost:3000`
   - 배포: `https://your-domain.com`
7. **승인된 리디렉션 URI**에 아래 주소 추가:
   - 개발: `http://localhost:3000/api/auth/callback/google`
   - 배포: `https://your-domain.com/api/auth/callback/google`
8. **만들기** 클릭
9. 표시되는 **클라이언트 ID**와 **클라이언트 보안 비밀** 복사

---

## 5. 환경 변수 설정

`.env.local`에 다음 값 입력:

```
AUTH_GOOGLE_ID=복사한_클라이언트_ID
AUTH_GOOGLE_SECRET=복사한_클라이언트_보안_비밀
```

`AUTH_SECRET`은 이미 생성되어 있습니다. 새로 생성하려면:

```bash
npx auth secret
```

---

## 6. 로그인 허용 설정

**특정 이메일**과 **도메인**을 함께 사용할 수 있습니다.

```
ALLOWED_EMAILS=festbookinc@gmail.com
ALLOWED_EMAIL_DOMAINS=festbook.co.kr
```

- `festbookinc@gmail.com` → 로그인 가능
- `craft@festbook.co.kr` → 로그인 가능 (도메인 허용)
- `xxx@festbook.co.kr` → 로그인 가능 (도메인 허용)

여러 이메일/도메인은 쉼표로 구분합니다.

---

## 7. 확인

개발 서버 재시작 후 로그인 버튼 클릭:

```bash
npm run dev
```

`ALLOWED_EMAILS` 또는 `ALLOWED_EMAIL_DOMAINS`에 설정한 계정/도메인으로만 로그인할 수 있습니다.

---

## 참고: 테스트 모드 vs 프로덕션

- **테스트 모드**: OAuth 동의 화면에서 '테스트'로 두면, 테스트 사용자로 등록한 이메일만 로그인 가능
- **프로덕션**: '앱 게시' 후 검증 완료하면 모든 사용자가 로그인 가능 (도메인 제한은 `ALLOWED_EMAIL_DOMAINS`로 별도 적용)
