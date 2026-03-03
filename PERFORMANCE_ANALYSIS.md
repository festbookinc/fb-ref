# 성능 분석 및 개선 계획

> 작성: 2026-03-01  
> 상태: 분석 완료, 개선 대기 중

---

## 결론 요약

무료 플랜(Supabase, Vercel)의 Cold Start도 영향을 주지만, **코드 구조 자체의 문제가 더 근본적인 원인**이다.

---

## 원인 1: 플랫폼 Cold Start

### Supabase Free
- DB가 7일 이상 비활동 시 자동 Pause
- 재시작까지 약 5~10초 소요 → 초기 접속이 느린 주요 원인 중 하나

### Vercel Free
- 서버리스 함수 Cold Start
- 함수가 잠시 미사용되면 재시작에 수백 ms 추가

---

## 원인 2: 코드 구조 문제

### 2-1. 이미지 상세 API 순차 쿼리 (가장 심각)

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

### 2-2. 태그 처리 N+1 쿼리

**파일**: `src/app/api/images/upload/route.ts`, `src/app/api/images/[id]/route.ts` (PATCH)

태그 수만큼 DB 왕복 발생. 태그 5개 = 10번 왕복.

```typescript
// 현재: 태그 개수만큼 루프
for (const name of tagNames) {
  await supabase.from("tags").upsert({ name })  // N번
  await supabase.from("image_tags").upsert(...)  // N번
}
```

→ 배치 upsert로 2번에 처리 가능

### 2-3. 전체 페이지 클라이언트 렌더링

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

### 2-4. next/image 미사용

**파일**: `src/components/ImageArchiveGrid.tsx`, `src/components/ImageDetailModal.tsx`, 기타 다수

모든 이미지가 `<img>` 태그로 원본 크기 그대로 로드됨.

`<Image>` 컴포넌트 사용 시 자동 적용되는 최적화 누락:
- 자동 WebP/AVIF 변환
- srcSet 및 반응형 sizes 생성
- CDN 레벨 이미지 리사이징
- blur placeholder

### 2-5. API 캐시 없음

**파일**: 모든 GET API Route

이미지 목록 같은 공개 API에 `Cache-Control` 헤더가 전혀 없어 매 요청마다 Supabase를 히트한다.

### 2-6. Supabase 클라이언트 매 요청마다 새로 생성

**파일**: `src/lib/supabase/admin.ts`

```typescript
// 현재: 매 요청마다 새 인스턴스 생성
export function createAdminClient() {
  return createClient(supabaseUrl, serviceRoleKey);
}
```

→ 모듈 레벨 싱글턴 패턴으로 변경

### 2-7. 이미지 목록 API 다단계 쿼리

**파일**: `src/app/api/images/route.ts`

페이지당 최대 7번의 순차 DB 왕복:
```
1. images 조회
2. profiles 조회 (작성자)
3. image_tags 조회
4. tags 조회
5. (검색 시) search_images RPC
6. (태그 필터 시) tags → image_tags 순차 조회
```

→ Supabase foreign key join (`select("*, image_tags(tags(name))")`) 으로 단순화 가능

---

## 우선순위별 개선 계획

| 우선순위 | 항목 | 파일 | 예상 효과 | 상태 |
|---|---|---|---|---|
| 🔴 높음 | 이미지 상세 API 병렬 쿼리화 (`Promise.all`) | `api/images/[id]/route.ts` | 레이턴시 50~70% 감소 | ⬜ 대기 |
| 🔴 높음 | 태그 처리 N+1 → 배치 upsert | `upload/route.ts`, `[id]/route.ts` | 업로드·수정 속도 개선 | ⬜ 대기 |
| 🟠 중간 | `createAdminClient` 싱글턴 패턴 | `lib/supabase/admin.ts` | 초기화 오버헤드 제거 | ⬜ 대기 |
| 🟠 중간 | `<img>` → `<Image>` 교체 + next.config 설정 | `ImageArchiveGrid.tsx` 외 | 이미지 로딩 체감 개선 | ⬜ 대기 |
| 🟡 낮음 | 목록 API `Cache-Control` 헤더 추가 | `api/images/route.ts` | 반복 접속 속도 개선 | ⬜ 대기 |
| 🟡 낮음 | 첫 페이지 Server Component pre-fetch | `app/page.tsx` | 초기 LCP 개선 | ⬜ 대기 |

---

## 참고: 관련 파일 목록

```
src/app/api/images/route.ts          - 이미지 목록 API
src/app/api/images/[id]/route.ts     - 이미지 상세 API (순차 쿼리)
src/app/api/images/upload/route.ts   - 이미지 업로드 (N+1 태그)
src/lib/supabase/admin.ts            - Supabase 클라이언트
src/components/ImageArchiveGrid.tsx  - 이미지 그리드 (img 태그)
src/components/ImageDetailModal.tsx  - 이미지 상세 모달 (img 태그)
src/app/page.tsx                     - 메인 페이지 (클라이언트 렌더링)
next.config.ts                       - 빈 설정 파일
```
