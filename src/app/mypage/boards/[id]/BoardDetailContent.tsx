"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
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
  images: ImageItem[];
}

export function BoardDetailContent({ boardId }: { boardId: string }) {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [removeLoading, setRemoveLoading] = useState(false);

  const refreshBoard = useCallback(() => {
    fetch(`/api/boards/${boardId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setBoard(data);
      })
      .catch(() => setBoard(null));
  }, [boardId]);

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

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!board) return;
    if (selectedIds.size === board.images.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(board.images.map((i) => i.id)));
    }
  };

  const handleExitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleRemoveFromBoard = async () => {
    if (selectedIds.size === 0 || !confirm(`선택한 ${selectedIds.size}개 이미지를 보드에서 제거하시겠습니까?`)) return;
    setRemoveLoading(true);
    try {
      for (const imageId of selectedIds) {
        const res = await fetch(`/api/boards/${boardId}/images?imageId=${imageId}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("제거 실패");
      }
      setSelectedIds(new Set());
      setSelectMode(false);
      refreshBoard();
    } catch (err) {
      console.error(err);
      alert("보드에서 제거에 실패했습니다.");
    } finally {
      setRemoveLoading(false);
    }
  };

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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          {board.name}
        </h1>
        {board.images.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {selectMode ? (
              <>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  {selectedIds.size === board.images.length ? "선택 해제" : "전체 선택"}
                </button>
                <button
                  type="button"
                  onClick={handleRemoveFromBoard}
                  disabled={selectedIds.size === 0 || removeLoading}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-50"
                >
                  {removeLoading ? "제거 중..." : `보드에서 제거 (${selectedIds.size})`}
                </button>
                <button
                  type="button"
                  onClick={handleExitSelectMode}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  취소
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setSelectMode(true)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                선택
              </button>
            )}
          </div>
        )}
      </div>

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
                if (selectMode) {
                  handleToggleSelect(img.id);
                } else {
                  setSelectedImageId(img.id);
                  setDetailModalOpen(true);
                }
              }}
              className={`group overflow-hidden rounded-lg border bg-white text-left shadow-sm transition-all duration-200 active:scale-[0.99] dark:bg-zinc-900 ${
                selectMode && selectedIds.has(img.id)
                  ? "border-zinc-900 ring-2 ring-zinc-900 dark:border-zinc-100 dark:ring-zinc-100"
                  : "border-zinc-200 hover:border-zinc-300 hover:shadow-md dark:border-zinc-700 dark:hover:border-zinc-600"
              }`}
            >
              <div className="relative aspect-[5/7] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                {selectMode && (
                  <div
                    className={`absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-md border-2 ${
                      selectedIds.has(img.id)
                        ? "border-white bg-zinc-900 dark:border-zinc-800 dark:bg-zinc-100"
                        : "border-white/90 bg-zinc-500/50 dark:border-zinc-700 dark:bg-zinc-600/50"
                    }`}
                  >
                    {selectedIds.has(img.id) && (
                      <svg className="h-4 w-4 text-white dark:text-zinc-900" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                )}
                <Image
                  src={img.image_url}
                  alt={img.title}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
                  className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                  loading="lazy"
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
        onUpdate={refreshBoard}
      />
    </>
  );
}
