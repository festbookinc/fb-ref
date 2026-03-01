"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MyImagesGrid } from "./images/MyImagesGrid";
import { MyLikesGrid } from "./images/MyLikesGrid";

type TabId = "saved" | "boards" | "likes";

interface Board {
  id: string;
  name: string;
  created_at: string;
  thumbnails: string[];
}

export function MyPageContent() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
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
      setBoards((prev) => [{ ...data.board, thumbnails: [] }, ...prev]);
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

  const [activeTab, setActiveTab] = useState<TabId>("saved");

  const tabs: { id: TabId; label: string }[] = [
    { id: "saved", label: "저장한 이미지" },
    { id: "boards", label: "보드" },
    { id: "likes", label: "좋아요" },
  ];

  return (
    <div>
      <nav className="mb-6 flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800/50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-200 dark:hover:text-zinc-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "saved" && (
        <div className="mt-4">
          <MyImagesGrid />
        </div>
      )}

      {activeTab === "boards" && (
        <section className="mt-4">
          <form onSubmit={handleCreateBoard} className="mb-4 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              placeholder="새 보드 이름"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
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
            <div className="py-8 text-center text-zinc-500 dark:text-zinc-200">로딩 중...</div>
          ) : boards.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-600 dark:text-zinc-200">
              아직 보드가 없습니다. 위에서 새 보드를 만들어 보세요.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((board) => (
              <div
                key={board.id}
                className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              >
                {editBoardId === board.id ? (
                  <>
                    <div className="flex aspect-[15/7] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                      {board.thumbnails.length > 0 ? (
                        board.thumbnails.map((url, i) => (
                          <div
                            key={i}
                            className="flex-1 overflow-hidden border-r last:border-r-0 border-zinc-200 dark:border-zinc-700"
                          >
                            <img src={url} alt="" className="h-full w-full object-cover" />
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-1 items-center justify-center text-zinc-400 dark:text-zinc-200">
                          <span className="text-sm">이미지 없음</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 p-3">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 rounded border border-zinc-200 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(board.id)}
                        className="text-sm text-zinc-600 hover:underline dark:text-zinc-200"
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
                  </>
                ) : (
                  <Link href={`/mypage/boards/${board.id}`} className="block">
                    <div className="flex aspect-[15/7] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                      {board.thumbnails.length > 0 ? (
                        board.thumbnails.map((url, i) => (
                          <div
                            key={i}
                            className="flex-1 overflow-hidden border-r last:border-r-0 border-zinc-200 dark:border-zinc-700"
                          >
                            <img src={url} alt="" className="h-full w-full object-cover" />
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
                )}
                {editBoardId !== board.id && (
                  <div className="flex gap-2 border-t border-zinc-200 px-3 py-2 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => {
                        setEditBoardId(board.id);
                        setEditName(board.name);
                      }}
                      className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBoard(board.id)}
                      className="text-sm text-red-500 hover:text-red-700 dark:text-red-400"
                    >
                      삭제
                    </button>
                  </div>
                )}
              </div>
            ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "likes" && (
        <div className="mt-4">
          <MyLikesGrid />
        </div>
      )}
    </div>
  );
}
