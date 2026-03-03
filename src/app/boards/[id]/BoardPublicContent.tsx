"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ImageDetailModal } from "@/components/ImageDetailModal";

interface ImageItem {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  tags: string[];
}

interface BoardData {
  id: string;
  name: string;
  ownerId?: string | null;
  images: ImageItem[];
}

export function BoardPublicContent({ boardId }: { boardId: string }) {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/boards/${boardId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setBoard(data);
      })
      .catch(() => setBoard(null))
      .finally(() => setLoading(false));
  }, [boardId]);

  if (loading) {
    return <div className="py-12 text-center text-zinc-500 dark:text-zinc-200">로딩 중...</div>;
  }

  if (!board) {
    return (
      <div className="py-12 text-center text-zinc-500 dark:text-zinc-200">
        보드를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <>
      <Link
        href={board.ownerId ? `/profile/${board.ownerId}` : "/"}
        className="mb-6 inline-block text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-200 dark:hover:text-zinc-100"
      >
        ← {board.ownerId ? "프로필로" : "아카이브"}
      </Link>

      <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {board.name}
      </h1>

      {board.images.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-12 text-center text-sm text-zinc-500 dark:border-zinc-600 dark:text-zinc-200">
          이 보드에 추가된 이미지가 없습니다.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {board.images.map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() => {
                setSelectedImageId(img.id);
                setDetailModalOpen(true);
              }}
              className="group overflow-hidden rounded-lg border border-zinc-200 bg-white text-left shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md active:scale-[0.99] dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
            >
              <div className="aspect-[5/7] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                <img
                  src={img.image_url}
                  alt={img.title}
                  className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                />
              </div>
              <p className="truncate p-2 text-xs text-zinc-700 dark:text-zinc-100">
                {img.title}
              </p>
            </button>
          ))}
        </div>
      )}

      <ImageDetailModal
        imageId={selectedImageId}
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedImageId(null);
        }}
        onUpdate={() => {
          fetch(`/api/boards/${boardId}`)
            .then((r) => r.json())
            .then((data) => setBoard(data));
        }}
      />
    </>
  );
}
