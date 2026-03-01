import { Suspense } from "react";
import { ImageArchiveGrid } from "@/components/ImageArchiveGrid";
import { DropZone } from "@/components/DropZone";

export default function Home() {
  return (
    <div className="w-full">
      <DropZone>
        <Suspense fallback={<div className="flex justify-center py-24">로딩 중...</div>}>
          <ImageArchiveGrid />
        </Suspense>
      </DropZone>
    </div>
  );
}
