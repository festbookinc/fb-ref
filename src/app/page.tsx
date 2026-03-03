import { Suspense } from "react";
import { ImageArchiveGrid } from "@/components/ImageArchiveGrid";
import { DropZone } from "@/components/DropZone";
import { getInitialImages } from "@/lib/getInitialImages";

// 메인 페이지 첫 이미지 목록을 서버에서 미리 가져와 클라이언트 hydration 직후 바로 표시
export default async function Home() {
  const { images: initialImages, hasMore: initialHasMore } = await getInitialImages(24);

  return (
    <div className="w-full">
      <DropZone>
        <Suspense fallback={<div className="flex justify-center py-24">로딩 중...</div>}>
          <ImageArchiveGrid initialImages={initialImages} initialHasMore={initialHasMore} />
        </Suspense>
      </DropZone>
    </div>
  );
}
