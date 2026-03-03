"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ImageDetailModal } from "@/components/ImageDetailModal";

interface BoardItem {
  id: string;
  name: string;
  created_at: string;
  thumbnails: string[];
}

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
}

interface ProfileInfo {
  id: string;
  name: string;
  image: string | null;
}

export function ProfilePageContent({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [boards, setBoards] = useState<BoardItem[]>([]);
  const [boardsLoading, setBoardsLoading] = useState(true);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [totalImages, setTotalImages] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/profile/${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setProfile(data);
      })
      .catch(() => setProfile(null));
  }, [userId]);

  useEffect(() => {
    setBoardsLoading(true);
    fetch(`/api/boards?user=${userId}`)
      .then((r) => r.json())
      .then((data) => setBoards(data.boards || []))
      .catch(() => setBoards([]))
      .finally(() => setBoardsLoading(false));
  }, [userId]);

  const fetchImages = useCallback(
    async (pageNum = 1, append = false) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: "24",
          sort: "latest",
          user: userId,
        });
        const res = await fetch(`/api/images?${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "조회 실패");
        setImages((prev) => (append ? [...prev, ...data.images] : data.images));
        setHasMore(data.hasMore);
        if (!append) setTotalImages(data.total ?? null);
      } catch (err) {
        console.error(err);
        setImages([]);
      } finally {
        setLoading(false);
      }
    },
    [userId]
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

  if (!profile) {
    return (
      <div className="py-12 text-center text-zinc-500 dark:text-zinc-200">
        프로필을 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-4">
          {profile.image && (
            <Image
              src={profile.image}
              alt=""
              width={64}
              height={64}
              className="h-16 w-16 rounded-full object-cover"
            />
          )}
          {!profile.image && (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-200 text-xl font-medium text-zinc-500 dark:bg-zinc-700 dark:text-zinc-300">
              {profile.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              {profile.name}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-200">
              업로드한 이미지 {totalImages != null ? `${totalImages}개` : ""}
              {boards.length > 0 && ` · 보드 ${boards.length}개`}
            </p>
          </div>
        </div>
      </div>

      {boards.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            보드
          </h2>
          {boardsLoading ? (
            <div className="py-8 text-center text-zinc-500 dark:text-zinc-200">로딩 중...</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {boards.map((board) => (
                <Link
                  key={board.id}
                  href={`/boards/${board.id}`}
                  className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                >
                  <div className="flex aspect-[15/7] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                    {board.thumbnails.length > 0 ? (
                      board.thumbnails.map((url, i) => (
                        <div
                          key={i}
                          className="relative flex-1 overflow-hidden border-r last:border-r-0 border-zinc-200 dark:border-zinc-700"
                        >
                          <Image src={url} alt="" fill sizes="15vw" className="object-cover" />
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-1 items-center justify-center text-zinc-400 dark:text-zinc-200">
                        <span className="text-sm">이미지 없음</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                      {board.name}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        업로드한 이미지
      </h2>

      {loading && images.length === 0 ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-600 dark:border-t-zinc-400" />
        </div>
      ) : images.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 py-12 text-center text-sm text-zinc-500 dark:border-zinc-600 dark:text-zinc-200">
          아직 업로드한 이미지가 없습니다.
        </p>
      ) : (
        <div
          className="grid gap-2 sm:gap-3"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
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
                <Image
                  src={img.image_url}
                  alt={img.title}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
                  className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="flex min-h-[4.5rem] flex-col justify-between gap-1 bg-zinc-200 p-3 dark:bg-zinc-900">
                <h3 className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-100">
                  {img.title}
                </h3>
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
