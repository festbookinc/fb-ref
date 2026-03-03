# 성능 분석 및 개선 계획

> 최초 작성: 2026-03-01  
> 갱신: 2026-03-01 (메시징·댓글수·알림 배지 기능 추가 반영)  
> 상태: 분석 완료, 개선 대기 중

---

## 결론 요약

무료 플랜(Supabase, Vercel)의 Cold Start도 영향을 주지만, **코드 구조 자체의 문제가 더 근본적인 원인**이다.  
신규 기능(메시징, 댓글 수, 읽지 않은 알림) 추가로 기존 쿼리 수가 증가하고, 폴링 기반 실시간 업데이트에서 새로운 병목이 확인되었다.

---

## 원인 1: 플랫폼 Cold Start

### Supabase Free
- DB가 7일 이상 비활동 시 자동 Pause
- 재시작까지 약 5~10초 소요 → 초기 접속이 느린 주요 원인 중 하나

### Vercel Free
- 서버리스 함수 Cold Start
- 함수가 잠시 미사용되면 재시작에 수백 ms 추가

---

## 원인 2: 기존 코드 구조 문제

### 2-1. 이미지 상세 API 순차 쿼리 (높음)

**파일**: `src/app/api/images/[id]/route.ts`

단일 이미지 조회 시 독립적인 쿼리 6~8개가 **순서대로** 실행된다.

```
1. images 조회
2. 작성자 profile 조회
3. image_tags 조회
4. tags 조회
5. comments 조회
6. 댓글 작성자 profiles 조회
7. 좋아요 수 조회
8. 현재 유저 좋아요 여부 조회 (profiles 재조회)
```

→ 독립적인 쿼리들을 `Promise.all()`로 병렬 처리하면 레이턴시 50~70% 감소 예상

### 2-2. 태그 처리 N+1 쿼리 (높음)

**파일**: `src/app/api/images/upload/route.ts`, `src/app/api/images/[id]/route.ts` (PATCH)

태그 수만큼 DB 왕복 발생. 태그 5개 = 10번 왕복.

```typescript
// 현재: 태그 개수만큼 루프
for (const name of tagNames) {
  await supabase.from("tags").upsert({ name })   // N번
  await supabase.from("image_tags").upsert(...)  // N번
}
```

→ 배치 upsert로 2번에 처리 가능

### 2-3. 전체 페이지 클라이언트 렌더링 (낮음)

**파일**: `src/app/page.tsx`, `src/components/ImageArchiveGrid.tsx`

현재 초기 화면 표시 순서:
```
1. HTML 수신 (빈 껍데기)
2. JS 번들 다운로드 및 파싱
3. React Hydration
4. /api/images 호출
5. 이미지 표시
```

→ Server Component에서 초기 데이터를 pre-fetch하면 단계 4 제거 가능

### 2-4. next/image 미사용 (중간)

**파일**: `src/components/ImageArchiveGrid.tsx`, `src/components/ImageDetailModal.tsx`, 기타 다수

모든 이미지가 `<img>` 태그로 원본 크기 그대로 로드됨.

`<Image>` 컴포넌트 사용 시 자동 적용되는 최적화 누락:
- 자동 WebP/AVIF 변환
- srcSet 및 반응형 sizes 생성
- CDN 레벨 이미지 리사이징
- blur placeholder

### 2-5. API 캐시 없음 (낮음)

**파일**: 모든 GET API Route

이미지 목록 같은 공개 API에 `Cache-Control` 헤더가 전혀 없어 매 요청마다 Supabase를 히트한다.

### 2-6. Supabase 클라이언트 매 요청마다 새로 생성 (중간)

**파일**: `src/lib/supabase/admin.ts`

```typescript
// 현재: 매 요청마다 새 인스턴스 생성
export function createAdminClient() {
  return createClient(supabaseUrl, serviceRoleKey);
}
```

→ 모듈 레벨 싱글턴 패턴으로 변경

### 2-7. 이미지 목록 API 다단계 쿼리 — 신규 기능으로 악화 (중간)

**파일**: `src/app/api/images/route.ts`

댓글 수 기능 추가 후 요청당 최대 **10회 순차 쿼리**:

```
1. profiles (mine/likes 시)        6. profiles (작성자)
2. image_likes (likes 시)          7. image_tags (결과 태그)  ← 4/5번과 중복
3. search_images RPC (검색 시)     8. tags (태그 이름)
4. tags (태그 필터 시)             9. comments (댓글 수) ← 신규 추가
5. image_tags (태그 필터 시)      10. images (메인)
```

특히 `image_tags`를 태그 필터 단계와 결과 enrich 단계에서 중복 조회하며, `comments`를 행 전체(`select("image_id")`)로 가져온 뒤 JS에서 집계하는 구조는 비효율적이다.

→ Supabase foreign key join (`select("*, image_tags(tags(name))")`) 및 DB `COUNT(*) GROUP BY` RPC로 단순화 가능

---

## 원인 3: 신규 기능 추가로 발생한 문제

### 3-1. MessagingWidget 5초 폴링 + 읽음처리 DB 쓰기 (긴급)

**파일**: `src/components/MessagingWidget.tsx`, `src/app/api/messages/[id]/route.ts`

채팅창이 열려 있는 동안 5초마다 GET 요청이 발생하며, 해당 API는 읽지 않은 메시지의 `read_at`을 UPDATE하는 쓰기 작업을 포함한다. 새 메시지가 없어도 매 폴링마다 DB 쓰기가 발생한다.

```
5초 폴링 → GET /api/messages/[id]
           → messages 전체 조회 (페이지네이션 없음)
           → read_at UPDATE (새 메시지 없어도 실행)
```

추가 문제: 메시지를 `.limit()` 없이 전체 조회하므로, 대화가 길어질수록 응답 크기가 선형 증가한다.

→ 개선 방향:
- Supabase Realtime으로 폴링 자체를 대체
- 또는 `?after=lastMessageId` 증분 조회 + 읽음처리를 별도 `PATCH` 엔드포인트로 분리
- 메시지 최신 N개만 로드 후 역방향 무한 스크롤 구현

### 3-2. AuthorLink 동시 마운트 시 API 중복 호출 경쟁 조건 (높음)

**파일**: `src/components/AuthorLink.tsx`

`cachedMyId`가 모듈 싱글톤으로 선언되어 있으나, 페이지에 `AuthorLink`가 24개 있을 때 모두 동시 마운트되면 캐시 세팅 전에 모든 인스턴스가 조건을 통과해 `/api/profile/me`를 최대 **24번 동시 호출**한다.

```typescript
// 현재: 캐시가 세팅되기 전에 모든 인스턴스가 동시에 통과
let cachedMyId: string | null | undefined = undefined;
if (cachedMyId !== undefined) return cachedMyId ?? null; // 동시에 모두 false
```

추가 문제: 모듈 레벨 변수는 다른 사용자가 로그인해도 초기화되지 않아 잘못된 `myId`가 캐시에 남을 수 있다.

→ 개선 방향:
- `MessagingContext`에 `myProfileId`를 통합해 앱 전체에서 1회만 fetch
- 또는 Promise deduplication: 진행 중인 fetch가 있으면 같은 Promise를 공유

```typescript
// 개선안: 진행 중인 Promise 재사용
let pendingPromise: Promise<string | null> | null = null;
function getMyProfileId(): Promise<string | null> {
  if (cachedMyId !== undefined) return Promise.resolve(cachedMyId ?? null);
  if (pendingPromise) return pendingPromise;
  pendingPromise = fetch("/api/profile/me")
    .then((r) => r.json())
    .then((d) => { cachedMyId = d.id ?? null; return cachedMyId ?? null; })
    .finally(() => { pendingPromise = null; });
  return pendingPromise;
}
```

### 3-3. 메시지 목록 API 무제한 로드 + JS 집계 (중간)

**파일**: `src/app/api/messages/route.ts`

모든 대화의 전체 메시지를 `.limit()` 없이 가져온 뒤 JS `for` 루프로 최신 메시지와 unread 수를 집계한다. 대화가 많아질수록 응답 크기와 처리 시간이 선형 증가한다.

```typescript
// 현재: limit 없이 전체 메시지 로드
const { data: recentMsgs } = await supabase
  .from("messages")
  .select("conversation_id, content, created_at, sender_id, read_at")
  .in("conversation_id", convIds)
  .order("created_at", { ascending: false });
// 이후 JS for 루프로 최신 메시지, unread 수 집계
```

→ 개선 방향:
- DB 뷰 또는 RPC로 `(last_message, unread_count) GROUP BY conversation_id`를 DB 레벨로 이동
- 대화당 최신 메시지 1건만 가져오는 `DISTINCT ON (conversation_id)` 쿼리 활용

### 3-4. 미읽음 수 API 3단계 순차 쿼리 + 캐시 없음 (낮음)

**파일**: `src/app/api/messages/unread/route.ts`

`profiles` → `conversations` → `messages COUNT` 3회 직렬 실행. Navbar에서 30초마다 호출되므로 사용자 수 × (1/30s) 빈도로 DB를 히트한다.

```
GET /api/messages/unread (30초마다)
  → profiles 조회 (email → id)
  → conversations 조회 (내 대화 목록)
  → messages COUNT (읽지 않은 수)
```

→ 개선 방향:
- DB RPC 한 번으로 JOIN + COUNT 통합
- `Cache-Control: max-age=25` 추가로 동일 요청 중복 방지

### 3-5. Navbar 폴링 의존성 불안정 (낮음)

**파일**: `src/components/Navbar.tsx`

`session` 객체 전체를 `useEffect` 의존성으로 사용. NextAuth 내부 세션 재검증 시 객체 참조가 변경되면 인터벌이 불필요하게 재설정된다.

```typescript
// 현재: session 객체 전체가 의존성
useEffect(() => {
  if (!session) { ... }
  const interval = setInterval(fetchUnread, 30000);
  return () => clearInterval(interval);
}, [session]); // session 객체 참조가 바뀔 때마다 재등록
```

→ 개선 방향:
- `session?.user?.email` 같은 원시값으로 의존성 교체
- `visibilitychange` 이벤트로 백그라운드 탭에서 폴링 중단

---

## 우선순위별 개선 계획

| 우선순위 | 항목 | 파일 | 예상 효과 | 구분 |
|---|---|---|---|---|
| 긴급 | 메시지 폴링 + 읽음처리 분리 | `MessagingWidget`, `api/messages/[id]` | DB 쓰기 80% 감소 | 신규 |
| 높음 | 이미지 상세 API 병렬화 (`Promise.all`) | `api/images/[id]/route.ts` | 레이턴시 50~70% 감소 | 기존 |
| 높음 | AuthorLink 경쟁 조건 해결 | `AuthorLink.tsx` | API 중복 호출 제거 | 신규 |
| 높음 | 태그 처리 N+1 → 배치 upsert | `upload/route.ts` | 업로드 속도 개선 | 기존 |
| 중간 | 메시지 목록 JS 집계 → DB 집계 | `api/messages/route.ts` | 메시지함 응답 개선 | 신규 |
| 중간 | 이미지 목록 쿼리 최적화 | `api/images/route.ts` | 메인 페이지 응답 개선 | 기존 (악화됨) |
| 중간 | `createAdminClient` 싱글턴 패턴 | `lib/supabase/admin.ts` | 초기화 오버헤드 제거 | 기존 |
| 중간 | `<img>` → `<Image>` 교체 | `ImageArchiveGrid.tsx` 외 | 이미지 로딩 체감 개선 | 기존 |
| 낮음 | 미읽음 수 API 최적화 + 캐시 | `api/messages/unread/route.ts` | 폴링 DB 부하 감소 | 신규 |
| 낮음 | API `Cache-Control` 헤더 추가 | 이미지·메시지 GET API 전체 | 반복 접속 속도 개선 | 기존 |
| 낮음 | Navbar 폴링 의존성 개선 | `Navbar.tsx` | 불필요한 재등록 방지 | 신규 |
| 낮음 | 첫 페이지 Server Component pre-fetch | `app/page.tsx` | 초기 LCP 개선 | 기존 |

---

## 참고: 관련 파일 목록

```
src/app/api/images/route.ts            - 이미지 목록 API (최대 10회 쿼리)
src/app/api/images/[id]/route.ts       - 이미지 상세 API (순차 쿼리)
src/app/api/images/upload/route.ts     - 이미지 업로드 (N+1 태그)
src/app/api/messages/route.ts          - 메시지 목록 API (무제한 로드 + JS 집계)
src/app/api/messages/[id]/route.ts     - 메시지 상세 API (폴링 + 읽음처리 혼재)
src/app/api/messages/unread/route.ts   - 미읽음 수 API (3단계 순차 쿼리)
src/lib/supabase/admin.ts              - Supabase 클라이언트 (매 요청마다 재생성)
src/components/ImageArchiveGrid.tsx    - 이미지 그리드 (img 태그)
src/components/ImageDetailModal.tsx    - 이미지 상세 모달 (img 태그)
src/components/MessagingWidget.tsx     - 채팅 위젯 (5초 폴링)
src/components/AuthorLink.tsx          - 작성자 링크 (경쟁 조건)
src/components/Navbar.tsx              - 네비게이션 (30초 폴링, 의존성 불안정)
src/app/page.tsx                       - 메인 페이지 (클라이언트 렌더링)
next.config.ts                         - next/image 도메인 미설정
```
