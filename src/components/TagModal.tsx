"use client";

import { useState, useEffect } from "react";

interface TagModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTags: string[];
  onApply: (tags: string[]) => void;
}

export function TagModal({ isOpen, onClose, selectedTags, onApply }: TagModalProps) {
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedTags));

  useEffect(() => {
    setSelected(new Set(selectedTags));
  }, [selectedTags, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const url = search
      ? `/api/tags?q=${encodeURIComponent(search)}`
      : "/api/tags";
    fetch(url)
      .then((res) => res.json())
      .then((data) => setTags(data.tags || []))
      .catch(() => setTags([]));
  }, [isOpen, search]);

  const toggleTag = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleApply = () => {
    onApply([...selected]);
    onClose();
  };

  const handleClear = () => {
    setSelected(new Set());
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tag-modal-title"
    >
      <div
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl animate-modal-content dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleApply();
          }
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="tag-modal-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            태그 선택
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-500 transition-all duration-200 hover:bg-zinc-100 hover:text-zinc-700 hover:scale-110 active:scale-95 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="닫기"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleApply();
            }
          }}
          placeholder="태그 검색..."
          className="mb-4 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />

        <div className="mb-4 max-h-60 overflow-y-auto">
          {tags.length === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-200">태그가 없습니다.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.name)}
                  className={`rounded-lg px-3 py-1.5 text-sm transition-all duration-200 ${
                    selected.has(tag.name)
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {selected.size > 0 && (
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-200">
            {selected.size}개 선택됨
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg px-4 py-2 text-sm text-zinc-500 transition-all duration-200 hover:bg-zinc-100 active:scale-95 dark:hover:bg-zinc-800"
          >
            초기화
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-zinc-700 hover:scale-[1.02] active:scale-[0.98] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            적용
          </button>
        </div>
      </div>
    </div>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
