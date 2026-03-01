"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { ImageDetailModal } from "@/components/ImageDetailModal";

interface ImageItem {
  id: string;
  title: string;
  description: string | null;
  link: string | null;
  image_url: string;
  created_at: string;
  author: string | null;
  tags: string[];
}

export function MyLikesGrid() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"latest" | "random">("latest");
  const [cardSize, setCardSize] = useState(220);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const effectiveCardSize = isMobile ? 160 : cardSize;
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  const fetchImages = useCallback(
    async (pageNum = 1, append = false) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: "24",
          sort,
          likes: "1",
        });
        const res = await fetch(`/api/images?${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "조회 실패");
        setImages((prev) => (append ? [...prev, ...data.images] : data.images));
        setHasMore(data.hasMore);
      } catch (err) {
        console.error(err);
        setImages([]);
      } finally {
        setLoading(false);
      }
    },
    [sort]
  );

  useEffect(() => {
    setPage(1);
    fetchImages(1, false);
  }, [fetchImages]);

  useEffect(() => {
    if (!hasMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setPage((p) => {
            const next = p + 1;
            fetchImages(next, true);
            return next;
          });
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );
    const el = loaderRef.current;
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, fetchImages]);

  const searchParams = useSearchParams();
  useEffect(() => {
    const openId = searchParams.get("open");
    if (openId) {
      setSelectedImageId(openId);
      setDetailModalOpen(true);
    }
  }, [searchParams]);

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as "latest" | "random";
    setSort(value);
    setPage(1);
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-end gap-3 sm:gap-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <select
            value={sort}
            onChange={handleSortChange}
            className="rounded-lg border border-zinc-200 bg-white pl-3 pr-8 py-2 text-sm text-zinc-700 transition-colors duration-150 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-500"
            aria-label="정렬 방식"
          >
            <option value="latest">최신순</option>
            <option value="random">랜덤순</option>
          </select>
          <div className="hidden h-4 w-px bg-zinc-200 sm:block dark:bg-zinc-700" />
          <div className="hidden items-center gap-2 sm:flex">
            <span className="text-sm text-zinc-500 dark:text-zinc-200">카드 크기</span>
            <input
              type="range"
              min="100"
              max="800"
              value={cardSize}
              onChange={(e) => setCardSize(Number(e.target.value))}
              className="h-2 w-24 rounded-lg accent-zinc-700 transition-opacity duration-150 hover:opacity-90 dark:accent-zinc-400"
              aria-label="이미지 카드 크기"
            />
          </div>
        </div>
      </div>

      <div
        className="grid gap-2 sm:gap-3"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${effectiveCardSize}px, 1fr))`,
        }}
      >
        {images.map((img) => (
          <button
            key={img.id}
            type="button"
            onClick={() => {
              setSelectedImageId(img.id);
              setDetailModalOpen(true);
            }}
            className="group overflow-hidden rounded-lg border border-zinc-200 bg-white text-left shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md active:scale-[0.99] dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
          >
            <div className="relative aspect-[5/7] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
              <img
                src={img.image_url}
                alt={img.title}
                className="h-full w-full object-cover object-center transition-transform duration-300 ease-out group-hover:scale-105"
                loading="lazy"
              />
            </div>
            <div className="flex min-h-[4.5rem] flex-col justify-between gap-1 bg-zinc-200 p-3 dark:bg-zinc-900">
              <div className="flex flex-col gap-1">
                <h3 className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-100">
                  {img.title}
                </h3>
                {img.author && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-200">by {img.author}</p>
                )}
              </div>
              <div className="mt-auto min-h-[1.5rem] flex flex-nowrap items-end gap-1 overflow-hidden">
                {img.tags.length > 0 ? (
                  <>
                    {img.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="shrink-0 rounded bg-zinc-300 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                      >
                        {tag}
                      </span>
                    ))}
                    {img.tags.length > 3 && (
                      <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-200">...</span>
                    )}
                  </>
                ) : null}
              </div>
            </div>
          </button>
        ))}
      </div>

      {loading && images.length === 0 && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-600 dark:border-t-zinc-400" />
        </div>
      )}

      {!loading && images.length === 0 && (
        <p className="rounded-lg border border-dashed border-zinc-300 py-12 text-center text-sm text-zinc-500 dark:border-zinc-600 dark:text-zinc-200">
          아직 좋아요한 이미지가 없습니다.
        </p>
      )}

      <div ref={loaderRef} className="h-20" />

      <ImageDetailModal
        imageId={selectedImageId}
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedImageId(null);
        }}
        onUpdate={() => fetchImages(1, false)}
      />
    </>
  );
}
