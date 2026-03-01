"use client";

import { useState, useEffect } from "react";

interface Board {
  id: string;
  name: string;
}

interface BoardAddBulkModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageIds: string[];
  onSuccess?: () => void;
}

export function BoardAddBulkModal({
  isOpen,
  onClose,
  imageIds,
  onSuccess,
}: BoardAddBulkModalProps) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardIds, setSelectedBoardIds] = useState<Set<string>>(new Set());
  const [newBoardName, setNewBoardName] = useState("");
  const [boardSearch, setBoardSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState("");

  const filteredBoards = boardSearch.trim()
    ? boards.filter((b) => b.name.toLowerCase().includes(boardSearch.trim().toLowerCase()))
    : boards;

  useEffect(() => {
    if (!isOpen) {
      setBoardSearch("");
      setSelectedBoardIds(new Set());
      setNewBoardName("");
      return;
    }
    setError("");
    fetch("/api/boards")
      .then((r) => r.json())
      .then((data) => setBoards(data.boards || []))
      .catch(() => setBoards([]));
  }, [isOpen]);

  const toggleBoard = (boardId: string) => {
    setSelectedBoardIds((prev) => {
      const next = new Set(prev);
      if (next.has(boardId)) next.delete(boardId);
      else next.add(boardId);
      return next;
    });
  };

  const handleApply = async () => {
    const toAdd = [...selectedBoardIds];
    const newName = newBoardName.trim();
    if (toAdd.length === 0 && !newName) {
      setError("추가할 보드를 선택하거나 새 보드 이름을 입력하세요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (newName) {
        const createRes = await fetch("/api/boards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName }),
        });
        const createData = await createRes.json();
        if (!createRes.ok) throw new Error(createData.error || "보드 생성 실패");
        toAdd.push(createData.board.id);
      }
      for (const boardId of toAdd) {
        const res = await fetch(`/api/boards/${boardId}/images`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageIds }),
        });
        if (!res.ok) throw new Error("추가 실패");
      }
      onSuccess?.();
      onClose();
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
        body: JSON.stringify({ imageIds }),
      });
      if (!addRes.ok) throw new Error("추가 실패");
      setSelectedBoardIds((prev) => new Set([...prev, board.id]));
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
      aria-label="보드에 추가"
    >
      <div
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl animate-modal-content dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            보드에 추가 ({imageIds.length}개 이미지)
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
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
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {createLoading ? "..." : "생성 후 추가"}
          </button>
        </form>

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
              {boardSearch.trim() ? "검색 결과 없음" : "보드가 없습니다. 위에서 새로 만드세요."}
            </p>
          ) : (
            <ul className="space-y-1">
              {filteredBoards.map((board) => (
                <label
                  key={board.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <input
                    type="checkbox"
                    checked={selectedBoardIds.has(board.id)}
                    onChange={() => toggleBoard(board.id)}
                    className="h-4 w-4 rounded border-zinc-300 accent-zinc-700 dark:accent-zinc-400"
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-100">{board.name}</span>
                </label>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

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
            disabled={loading || (selectedBoardIds.size === 0 && !newBoardName.trim())}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {loading ? "추가 중..." : "확인"}
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
