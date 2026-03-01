"use client";

import { useState, useEffect } from "react";

interface Board {
  id: string;
  name: string;
}

interface BoardSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBoardIds: Set<string>;
  newBoardName: string;
  onApply: (selectedIds: Set<string>, newBoardName: string) => void;
}

export function BoardSelectModal({
  isOpen,
  onClose,
  selectedBoardIds,
  newBoardName: initialNewBoardName,
  onApply,
}: BoardSelectModalProps) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(selectedBoardIds);
  const [newBoardName, setNewBoardName] = useState(initialNewBoardName);
  const [boardSearch, setBoardSearch] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setSelectedIds(selectedBoardIds);
    setNewBoardName(initialNewBoardName);
    setBoardSearch("");
    fetch("/api/boards")
      .then((r) => r.json())
      .then((data) => setBoards(data.boards || []))
      .catch(() => setBoards([]));
  }, [isOpen, selectedBoardIds, initialNewBoardName]);

  const filteredBoards = boardSearch.trim()
    ? boards.filter((b) => b.name.toLowerCase().includes(boardSearch.trim().toLowerCase()))
    : boards;

  const handleApply = () => {
    onApply(selectedIds, newBoardName.trim());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="보드 선택"
    >
      <div
        className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">보드에 추가</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="닫기"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {boards.length > 0 && (
          <input
            type="text"
            value={boardSearch}
            onChange={(e) => setBoardSearch(e.target.value)}
            placeholder="보드 검색..."
            className="mb-3 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        )}

        <div className="max-h-48 overflow-y-auto">
          {filteredBoards.length === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-200">
              {boardSearch.trim() ? "검색 결과 없음" : "보드가 없습니다."}
            </p>
          ) : (
            <ul className="space-y-0.5">
              {filteredBoards.map((board) => (
                <label
                  key={board.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(board.id)}
                    onChange={(e) => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(board.id);
                        else next.delete(board.id);
                        return next;
                      });
                    }}
                    className="h-4 w-4 rounded border-zinc-300 accent-zinc-700 dark:accent-zinc-400"
                  />
                  <span className="truncate text-sm text-zinc-700 dark:text-zinc-100">{board.name}</span>
                </label>
              ))}
            </ul>
          )}
        </div>

        <input
          type="text"
          value={newBoardName}
          onChange={(e) => setNewBoardName(e.target.value)}
          placeholder="새 보드 이름 (생성 후 추가)"
          className="mt-3 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            확인
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
