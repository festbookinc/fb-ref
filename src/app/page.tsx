import { Suspense } from "react";
import { ImageArchiveGrid } from "@/components/ImageArchiveGrid";
import { DropZone } from "@/components/DropZone";
import { getInitialImages } from "@/lib/getInitialImages";

// 매 요청마다 서버에서 최신 데이터를 조회 (정적 캐시 방지)
export const dynamic = "force-dynamic";

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
