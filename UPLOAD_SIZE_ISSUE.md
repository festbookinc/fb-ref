# 이미지 업로드 용량 문제 분석 및 해결

## 문제 원인

### 1. Vercel 서버리스 함수 4.5MB 제한 (핵심)

- **Vercel 배포 시**: 요청 본문(Request Body)이 **4.5MB를 초과하면 413 FUNCTION_PAYLOAD_TOO_LARGE** 에러 발생
- **변경 불가**: 이 제한은 Vercel 플랫폼에서 **고정**되어 있어 설정으로 늘릴 수 없음
- 현재 흐름: 사용자 → (전체 파일) → API Route → Sharp 처리 → Supabase Storage
- 5MB 이상 이미지(예: 스마트폰 원본)를 업로드하면 API에 도달하기 전에 차단됨

### 2. Supabase Storage 10MB 제한

- `002_storage_bucket.sql`에서 `file_size_limit: 10485760` (10MB) 설정
- 10MB 초과 파일은 Storage 업로드 시점에 실패
- Vercel 제한을 우회해도 이 제한은 여전히 적용됨

### 3. 업로드 흐름

```
[클라이언트] -- FormData(원본 파일) --> [Vercel API] -- WebP 변환 --> [Supabase Storage]
                    ↑
            4.5MB 초과 시 여기서 차단
```

## 해결 방안

### 방안 A: 클라이언트 사이드 압축 (권장)

- **방식**: 업로드 전에 브라우저에서 이미지를 압축·리사이즈
- **장점**: 
  - 서버 코드 변경 최소화
  - 기존 API 흐름 유지
  - Vercel 4.5MB 제한 회피
- **구현**: `browser-image-compression` 등으로 파일 크기·해상도 제한 후 압축

### 방안 B: 클라이언트 → Supabase 직접 업로드

- **방식**: 업로드용 Signed URL 생성 → 클라이언트가 직접 Storage에 업로드
- **장점**: 
  - 서버를 거치지 않아 Vercel 제한 영향 없음
- **단점**: 
  - 서버에서 Sharp/WebP 변환 불가능
  - 원본 포맷(JPEG/PNG 등) 저장 → 용량 증가
  - Supabase 10MB 제한은 그대로 유지

### 방안 C: 하이브리드

- **작은 파일**: 기존처럼 API 경유 → Sharp로 WebP 변환
- **큰 파일**: Signed URL로 직접 업로드 후 메타데이터만 API로 전송

## 추천 구현: 방안 A (클라이언트 압축) ✅ 적용됨

1. `browser-image-compression` 설치
2. `UploadModal`에서 FormData에 넣기 전에 `compressImageForUpload()` 호출
3. 목표: 최대 파일 크기 ~4MB, 최대 해상도 2048px
4. `src/lib/compressImage.ts`에 압축 유틸 구현
