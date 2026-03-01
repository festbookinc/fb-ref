"use client";

import { useState, useEffect } from "react";

interface Board {
  id: string;
  name: string;
  created_at: string;
}

interface BoardAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageId: string;
  onSuccess?: () => void;
}

export function BoardAddModal({ isOpen, onClose, imageId, onSuccess }: BoardAddModalProps) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [inBoardIds, setInBoardIds] = useState<Set<string>>(new Set());
  const [newBoardName, setNewBoardName] = useState("");
  const [loading, setLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    Promise.all([
      fetch("/api/boards").then((r) => r.json()),
      fetch(`/api/images/${imageId}/boards`).then((r) => r.json()),
    ])
      .then(([boardsRes, inBoardsRes]) => {
        setBoards(boardsRes.boards || []);
        setInBoardIds(new Set(inBoardsRes.boardIds || []));
      })
      .catch(() => setBoards([]));
  }, [isOpen, imageId]);

  const toggleBoard = async (boardId: string) => {
    const isIn = inBoardIds.has(boardId);
    setLoading(true);
    setError("");
    try {
      if (isIn) {
        const res = await fetch(`/api/boards/${boardId}/images?imageId=${imageId}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("제거 실패");
        setInBoardIds((prev) => {
          const next = new Set(prev);
          next.delete(boardId);
          return next;
        });
      } else {
        const res = await fetch(`/api/boards/${boardId}/images`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageId }),
        });
        if (!res.ok) throw new Error("추가 실패");
        setInBoardIds((prev) => new Set([...prev, boardId]));
      }
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류 발생");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newBoardName.trim();
    if (!name) return;
    setCreateLoading(true);
    setError("");
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "생성 실패");
      const board = data.board;
      setBoards((prev) => [board, ...prev]);
      setNewBoardName("");

      const addRes = await fetch(`/api/boards/${board.id}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      });
      if (!addRes.ok) throw new Error("추가 실패");
      setInBoardIds((prev) => new Set([...prev, board.id]));
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류 발생");
    } finally {
      setCreateLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 animate-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl animate-modal-content dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            보드에 추가
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-500 transition-all duration-200 hover:bg-zinc-100 hover:text-zinc-700 hover:scale-110 active:scale-95 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            aria-label="닫기"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleCreateAndAdd} className="mb-4 flex gap-2">
          <input
            type="text"
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            placeholder="새 보드 이름"
            className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <button
            type="submit"
            disabled={createLoading || !newBoardName.trim()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {createLoading ? "..." : "생성 후 추가"}
          </button>
        </form>

        <div className="max-h-48 overflow-y-auto">
          {boards.length === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-500">보드가 없습니다. 위에서 새로 만드세요.</p>
          ) : (
            <ul className="space-y-1">
              {boards.map((board) => (
                <li key={board.id}>
                  <button
                    type="button"
                    onClick={() => toggleBoard(board.id)}
                    disabled={loading}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-all duration-200 ${
                      inBoardIds.has(board.id)
                        ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <span>{board.name}</span>
                    {inBoardIds.has(board.id) && (
                      <span className="text-xs text-zinc-500">추가됨</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
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
