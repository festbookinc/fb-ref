"use client";

import { useState, useEffect } from "react";

interface Board {
  id: string;
  name: string;
  created_at: string;
}

interface ImageItem {
  id: string;
  title: string;
  image_url: string;
  tags: string[];
}

export function MyPageContent() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBoardId, setExpandedBoardId] = useState<string | null>(null);
  const [boardImages, setBoardImages] = useState<Record<string, ImageItem[]>>({});
  const [newBoardName, setNewBoardName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [editBoardId, setEditBoardId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const fetchBoards = () => {
    fetch("/api/boards")
      .then((r) => r.json())
      .then((data) => setBoards(data.boards || []))
      .catch(() => setBoards([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoardImages = async (boardId: string) => {
    if (boardImages[boardId]) return;
    const res = await fetch(`/api/boards/${boardId}`);
    const data = await res.json();
    if (data.images) setBoardImages((prev) => ({ ...prev, [boardId]: data.images }));
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;
    setCreateLoading(true);
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBoardName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBoards((prev) => [{ ...data.board }, ...prev]);
      setNewBoardName("");
    } catch (err) {
      console.error(err);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (!confirm("이 보드를 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/boards/${boardId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 실패");
      setBoards((prev) => prev.filter((b) => b.id !== boardId));
      setBoardImages((prev) => {
        const next = { ...prev };
        delete next[boardId];
        return next;
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveEdit = async (boardId: string) => {
    if (!editName.trim()) return;
    try {
      const res = await fetch(`/api/boards/${boardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (!res.ok) throw new Error("수정 실패");
      setBoards((prev) =>
        prev.map((b) => (b.id === boardId ? { ...b, name: editName.trim() } : b))
      );
      setEditBoardId(null);
      setEditName("");
    } catch (err) {
      console.error(err);
    }
  };

  const [myImages, setMyImages] = useState<ImageItem[]>([]);
  const [myImagesLoading, setMyImagesLoading] = useState(true);

  useEffect(() => {
    fetch("/api/images?mine=1&limit=12")
      .then((r) => r.json())
      .then((data) => setMyImages(data.images || []))
      .catch(() => setMyImages([]))
      .finally(() => setMyImagesLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          내가 업로드한 이미지
        </h2>
        {myImagesLoading ? (
          <p className="text-sm text-zinc-500">로딩 중...</p>
        ) : myImages.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-600">
            아직 업로드한 이미지가 없습니다.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {myImages.map((img) => (
              <a
                key={img.id}
                href={`/?open=${img.id}`}
                className="group overflow-hidden rounded-lg border border-zinc-200 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md active:scale-[0.99] dark:border-zinc-700 dark:hover:border-zinc-600"
              >
                <div className="aspect-[5/7] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  <img
                    src={img.image_url}
                    alt={img.title}
                    className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                  />
                </div>
                <p className="truncate p-2 text-xs text-zinc-700 dark:text-zinc-300">
                  {img.title}
                </p>
              </a>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          보드 관리
        </h2>
        <form onSubmit={handleCreateBoard} className="mb-4 flex gap-2">
          <input
            type="text"
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            placeholder="새 보드 이름"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <button
            type="submit"
            disabled={createLoading || !newBoardName.trim()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] dark:bg-zinc-100 dark:text-zinc-900"
          >
            {createLoading ? "생성 중..." : "보드 만들기"}
          </button>
        </form>

        {loading ? (
          <div className="py-8 text-center text-zinc-500">로딩 중...</div>
        ) : boards.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-600">
            아직 보드가 없습니다. 위에서 새 보드를 만들어 보세요.
          </p>
        ) : (
          <div className="space-y-4">
            {boards.map((board) => (
              <div
                key={board.id}
                className="rounded-lg border border-zinc-200 bg-white transition-colors duration-200 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div
                  className="flex cursor-pointer items-center justify-between p-4"
                  onClick={() => {
                    setExpandedBoardId((prev) => (prev === board.id ? null : board.id));
                    if (expandedBoardId !== board.id) fetchBoardImages(board.id);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-500">
                      {expandedBoardId === board.id ? "▼" : "▶"}
                    </span>
                    {editBoardId === board.id ? (
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="rounded border border-zinc-200 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(board.id)}
                          className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
                        >
                          저장
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditBoardId(null);
                            setEditName("");
                          }}
                          className="text-sm text-zinc-500 hover:underline"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                        {board.name}
                      </h3>
                    )}
                  </div>
                  {editBoardId !== board.id && (
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditBoardId(board.id);
                          setEditName(board.name);
                        }}
                        className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBoard(board.id)}
                        className="text-sm text-red-500 hover:text-red-700"
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </div>

                {expandedBoardId === board.id && (
                  <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {(boardImages[board.id] || []).map((img) => (
                        <a
                          key={img.id}
                          href={`/?open=${img.id}`}
                          className="group block overflow-hidden rounded-lg border border-zinc-200 transition-all duration-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
                        >
                          <div className="aspect-[5/7] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                            <img
                              src={img.image_url}
                              alt={img.title}
                              className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                            />
                          </div>
                          <p className="truncate p-2 text-xs text-zinc-700 dark:text-zinc-300">
                            {img.title}
                          </p>
                        </a>
                      ))}
                    </div>
                    {(boardImages[board.id] || []).length === 0 && (
                      <p className="py-8 text-center text-sm text-zinc-500">
                        이 보드에 추가된 이미지가 없습니다.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
