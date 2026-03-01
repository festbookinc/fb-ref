"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useRefresh } from "@/contexts/RefreshContext";
import { useSearch } from "@/contexts/SearchContext";
import { ImageDetailModal } from "./ImageDetailModal";

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

export function ImageArchiveGrid() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"latest" | "random">("latest");
  const [cardSize, setCardSize] = useState(280);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);
  const { registerRefresh } = useRefresh() ?? {};
  const { query = "", selectedTags = [] } = useSearch() ?? {};
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const fetchImages = useCallback(
    async (pageNum = 1, append = false) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: "24",
          sort,
        });
        if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
        if (selectedTags.length) params.set("tags", selectedTags.join(","));
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
    [sort, debouncedQuery, selectedTags]
  );

  useEffect(() => {
    setPage(1);
    fetchImages(1, false);
  }, [fetchImages]);

  useEffect(() => {
    registerRefresh?.(() => fetchImages(1, false));
  }, [registerRefresh, fetchImages]);

  // Infinite scroll
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
    <div className="w-full px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <select
            value={sort}
            onChange={handleSortChange}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 transition-colors duration-150 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:focus:border-zinc-500 dark:focus:ring-zinc-500"
            aria-label="정렬 방식"
          >
            <option value="latest">최신순</option>
            <option value="random">랜덤순</option>
          </select>
          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">카드 크기</span>
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
        className="grid gap-3 sm:gap-4"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${cardSize}px, 1fr))`,
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
                className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                loading="lazy"
              />
            </div>
            <div className="p-3">
              <h3 className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {img.title}
              </h3>
              {img.description && (
                <p className="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {img.description}
                </p>
              )}
              {img.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {img.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 transition-colors duration-150 dark:bg-zinc-800 dark:text-zinc-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {img.author && (
                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">by {img.author}</p>
              )}
            </div>
          </button>
        ))}
      </div>

      {loading && images.length === 0 && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-600 dark:border-t-zinc-400" />
        </div>
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
    </div>
  );
}
