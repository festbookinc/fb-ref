"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { TagAutocomplete } from "./TagAutocomplete";
import { BoardAddModal } from "./BoardAddModal";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  author: string;
}

interface ImageDetail {
  id: string;
  title: string;
  description: string | null;
  link: string | null;
  image_url: string;
  created_at: string;
  author: string | null;
  authorEmail: string | null;
  tags: string[];
  comments: Comment[];
  isAuthor: boolean;
}

interface ImageDetailModalProps {
  imageId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export function ImageDetailModal({
  imageId,
  isOpen,
  onClose,
  onUpdate,
}: ImageDetailModalProps) {
  const [detail, setDetail] = useState<ImageDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editTags, setEditTags] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [boardAddOpen, setBoardAddOpen] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !imageId) return;
    setLoading(true);
    setDetail(null);
    fetch(`/api/images/${imageId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setDetail(data);
        setEditTitle(data.title);
        setEditDescription(data.description || "");
        setEditLink(data.link || "");
        setEditTags(data.tags?.join(", ") || "");
      })
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [isOpen, imageId]);

  const handleDownload = () => {
    if (!detail?.image_url) return;
    const a = document.createElement("a");
    a.href = detail.image_url;
    a.download = `${detail.title.replace(/[/\\?%*:|"<>]/g, "-")}.webp`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageId || !commentText.trim()) return;
    setCommentLoading(true);
    try {
      const res = await fetch(`/api/images/${imageId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDetail((prev) =>
        prev
          ? { ...prev, comments: [...prev.comments, { ...data, author: data.author }] }
          : null
      );
      setCommentText("");
    } catch (err) {
      console.error(err);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!imageId) return;
    setSaveLoading(true);
    try {
      const res = await fetch(`/api/images/${imageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          link: editLink.trim() || null,
          tags: editTags.split(/[,，\s]+/).map((t) => t.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              title: editTitle.trim(),
              description: editDescription.trim() || null,
              link: editLink.trim() || null,
              tags: editTags.split(/[,，\s]+/).map((t) => t.trim()).filter(Boolean),
            }
          : null
      );
      setEditMode(false);
      onUpdate?.();
    } catch (err) {
      console.error(err);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!imageId || !confirm("정말 삭제하시겠습니까?")) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/images/${imageId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onClose();
      onUpdate?.();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl animate-modal-content dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex flex-1 items-center justify-center py-24">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-600 dark:border-t-zinc-400" />
          </div>
        ) : !detail ? (
          <div className="py-24 text-center text-zinc-500">이미지를 불러올 수 없습니다.</div>
        ) : (
          <>
            <div className="flex flex-1 overflow-hidden">
              <div className="flex min-w-0 flex-1 items-center justify-center bg-zinc-100 p-4 dark:bg-zinc-950">
                <img
                  src={detail.image_url}
                  alt={detail.title}
                  className="max-h-[70vh] max-w-full object-contain"
                />
              </div>
              <div className="flex w-96 flex-col overflow-y-auto border-l border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    {detail.title}
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

                <div className="flex flex-wrap gap-2 border-b border-zinc-200 p-4 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-700 transition-all duration-200 hover:bg-zinc-200 active:scale-95 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    다운로드
                  </button>
                  {detail.isAuthor && (
                    <>
                      <button
                        type="button"
                        onClick={() => (editMode ? handleSaveEdit() : setEditMode(true))}
                        disabled={saveLoading}
                        className="rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-700 transition-all duration-200 hover:bg-zinc-200 active:scale-95 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-50"
                      >
                        {editMode ? (saveLoading ? "저장 중..." : "저장") : "편집"}
                      </button>
                      {editMode && (
                        <button
                          type="button"
                          onClick={() => setEditMode(false)}
                          className="rounded-lg px-3 py-2 text-sm text-zinc-500 transition-all duration-200 hover:bg-zinc-100 active:scale-95 dark:hover:bg-zinc-800 dark:hover:text-zinc-400"
                        >
                          취소
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleteLoading}
                        className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-all duration-200 hover:bg-red-100 active:scale-95 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 disabled:opacity-50"
                      >
                        {deleteLoading ? "삭제 중..." : "삭제"}
                      </button>
                    </>
                  )}
                  {session && (
                    <button
                      type="button"
                      onClick={() => setBoardAddOpen(true)}
                      className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition-all duration-200 hover:bg-zinc-100 active:scale-95 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      보드에 추가
                    </button>
                  )}
                </div>

                <div className="flex-1 space-y-4 p-4">
                  {editMode ? (
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-500">제목</label>
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full rounded border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-500">설명</label>
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          rows={3}
                          className="w-full rounded border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-500">링크</label>
                        <input
                          value={editLink}
                          onChange={(e) => setEditLink(e.target.value)}
                          className="w-full rounded border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-500">태그</label>
                        <TagAutocomplete
                          value={editTags}
                          onChange={setEditTags}
                          placeholder="쉼표로 구분"
                          className="w-full rounded border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      {detail.description && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          {detail.description}
                        </p>
                      )}
                      {detail.link && (
                        <a
                          href={detail.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block truncate text-sm text-blue-600 underline dark:text-blue-400"
                        >
                          {detail.link}
                        </a>
                      )}
                      {detail.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {detail.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {detail.author && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          by {detail.author}
                        </p>
                      )}
                    </>
                  )}

                  <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
                    <h3 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      댓글 ({detail.comments.length})
                    </h3>
                    <div className="mb-4 max-h-40 space-y-2 overflow-y-auto">
                      {detail.comments.length === 0 ? (
                        <p className="text-sm text-zinc-500">아직 댓글이 없습니다.</p>
                      ) : (
                        detail.comments.map((c) => (
                          <div
                            key={c.id}
                            className="rounded-lg bg-zinc-50 p-2 text-sm dark:bg-zinc-800/50"
                          >
                            <p className="text-zinc-900 dark:text-zinc-100">{c.content}</p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {c.author} · {new Date(c.created_at).toLocaleDateString("ko-KR")}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                    <form onSubmit={handleCommentSubmit} className="flex gap-2">
                      <input
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="댓글 작성..."
                        className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        disabled={commentLoading}
                      />
                      <button
                        type="submit"
                        disabled={commentLoading || !commentText.trim()}
                        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                      >
                        {commentLoading ? "..." : "작성"}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {imageId && (
        <BoardAddModal
          isOpen={boardAddOpen}
          onClose={() => setBoardAddOpen(false)}
          imageId={imageId}
          onSuccess={() => onUpdate?.()}
        />
      )}
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
