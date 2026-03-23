"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { useRefresh } from "@/contexts/RefreshContext";
import { useSearch } from "@/contexts/SearchContext";
import { ImageDetailModal } from "./ImageDetailModal";
import { AuthorLink } from "./AuthorLink";
import { BoardAddBulkModal } from "./BoardAddBulkModal";

interface ImageItem {
  id: string;
  title: string;
  description: string | null;
  link: string | null;
  image_url: string;
  created_at: string;
  author: string | null;
  authorId?: string | null;
  tags: string[];
  commentCount?: number;
}

interface ImageArchiveGridProps {
  initialImages?: ImageItem[];
  initialHasMore?: boolean;
}

export function ImageArchiveGrid({ initialImages, initialHasMore }: ImageArchiveGridProps = {}) {
  const [images, setImages] = useState<ImageItem[]>(initialImages ?? []);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore ?? true);
  // 서버에서 초기 데이터가 제공되면 로딩 상태 없이 바로 표시
  const [loading, setLoading] = useState(!initialImages?.length);
  const [sort, setSort] = useState<"latest" | "random">("latest");
  const [cardSize, setCardSize] = useState(280);
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

  // 선택 모드
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [boardModalOpen, setBoardModalOpen] = useState(false);

  const handleToggleSelectMode = () => {
    setSelectMode((m) => !m);
    setSelectedIds(new Set());
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === images.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(images.map((i) => i.id)));
    }
  };

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    const selected = images.filter((img) => selectedIds.has(img.id));
    for (const img of selected) {
      try {
        const res = await fetch(img.image_url);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${img.title.replace(/[/\\?%*:|"<>]/g, "_")}.webp`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        await new Promise((r) => setTimeout(r, 200));
      } catch {
        // 개별 파일 실패 무시하고 다음 파일 계속
      }
    }
    setDownloading(false);
  };
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

  // 검색/정렬/태그가 바뀌면 다시 조회. 초기 렌더(기본값)에선 서버 pre-fetch 데이터를 그대로 사용.
  const isDefaultFetch = !debouncedQuery && selectedTags.length === 0 && sort === "latest";
  const hasInitialData = !!initialImages?.length;
  useEffect(() => {
    if (isDefaultFetch && hasInitialData && page === 1) return; // 서버 데이터 재사용
    setPage(1);
    fetchImages(1, false);
  }, [fetchImages]); // eslint-disable-line react-hooks/exhaustive-deps

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
    <div className="w-full px-4 py-2 sm:px-6 sm:py-3">
      {/* 툴바 */}
      <div className="mb-6 flex flex-wrap items-center justify-end gap-3 sm:gap-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* 선택 모드 액션 바 */}
          {selectMode ? (
            <>
              <button
                type="button"
                onClick={handleSelectAll}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                {selectedIds.size === images.length ? "전체 해제" : "전체 선택"}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={selectedIds.size === 0 || downloading}
                className="rounded-lg bg-zinc-700 px-3 py-2 text-sm text-white transition-colors hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-600 dark:hover:bg-zinc-500"
              >
                {downloading ? "다운로드 중…" : `다운로드${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
              </button>
              <button
                type="button"
                onClick={() => setBoardModalOpen(true)}
                disabled={selectedIds.size === 0}
                className="rounded-lg bg-zinc-700 px-3 py-2 text-sm text-white transition-colors hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-600 dark:hover:bg-zinc-500"
              >
                {`보드에 추가${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
              </button>
              <button
                type="button"
                onClick={handleToggleSelectMode}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                취소
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleToggleSelectMode}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                선택하기
              </button>
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
            </>
          )}
        </div>
      </div>

      <div
        className="grid gap-2 sm:gap-3"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${effectiveCardSize}px, 1fr))`,
        }}
      >
        {images.map((img) => {
          const isSelected = selectedIds.has(img.id);
          return (
          <button
            key={img.id}
            type="button"
            onClick={() => {
              if (selectMode) {
                handleToggleSelect(img.id);
              } else {
                setSelectedImageId(img.id);
                setDetailModalOpen(true);
              }
            }}
            className={`group overflow-hidden rounded-lg border bg-white text-left shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.99] dark:bg-zinc-900 ${
              selectMode && isSelected
                ? "border-zinc-700 ring-2 ring-zinc-700 dark:border-zinc-400 dark:ring-zinc-400"
                : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
            }`}
          >
            <div className="relative aspect-[5/7] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
              <Image
                src={img.image_url}
                alt={img.title}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
                className="object-cover object-center transition-transform duration-300 ease-out group-hover:scale-105"
                loading="lazy"
              />
              {/* 선택 모드 체크박스 오버레이 */}
              {selectMode && (
                <div className={`absolute inset-0 flex items-start justify-end p-2 transition-colors ${isSelected ? "bg-black/20" : "bg-transparent"}`}>
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 shadow ${
                    isSelected
                      ? "border-white bg-zinc-800 dark:bg-zinc-200"
                      : "border-white bg-white/60"
                  }`}>
                    {isSelected && (
                      <svg className="h-3 w-3 text-white dark:text-zinc-900" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex min-h-[4.5rem] flex-col justify-between gap-1 bg-zinc-200 p-3 dark:bg-zinc-900">
              <div className="flex flex-col gap-1">
                <h3 className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-100">
                  {img.title}
                </h3>
                {img.author && (
                  <p onClick={(e) => e.stopPropagation()}>
                    <AuthorLink author={img.author} authorId={img.authorId} />
                  </p>
                )}
              </div>
              <div className="mt-auto flex min-h-[1.5rem] items-end justify-between gap-1">
                <div className="flex min-w-0 flex-nowrap items-end gap-1 overflow-hidden">
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
                </div>
                {(img.commentCount ?? 0) > 0 && (
                  <span className="flex shrink-0 items-center gap-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                    <CommentIcon className="h-3 w-3" />
                    {img.commentCount}
                  </span>
                )}
              </div>
            </div>
          </button>
          );
        })}
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

      {boardModalOpen && (
        <BoardAddBulkModal
          imageIds={Array.from(selectedIds)}
          onClose={() => setBoardModalOpen(false)}
          onDone={() => {
            setBoardModalOpen(false);
            setSelectMode(false);
            setSelectedIds(new Set());
          }}
        />
      )}
    </div>
  );
}

function CommentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.83L3 20l1.04-3.63A7.6 7.6 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}
