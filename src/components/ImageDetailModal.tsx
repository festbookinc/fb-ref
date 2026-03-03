"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
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
  authorId?: string | null;
  tags: string[];
  comments: Comment[];
  isAuthor: boolean;
  likeCount: number;
  likedByMe: boolean;
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
  const [likeLoading, setLikeLoading] = useState(false);
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
        setDetail({
          ...data,
          likeCount: data.likeCount ?? 0,
          likedByMe: data.likedByMe ?? false,
        });
        setEditTitle(data.title);
        setEditDescription(data.description || "");
        setEditLink(data.link || "");
        setEditTags(data.tags?.join(", ") || "");
      })
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [isOpen, imageId]);

  const handleDownload = async () => {
    if (!detail?.image_url) return;
    try {
      const res = await fetch(detail.image_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${detail.title.replace(/[/\\?%*:|"<>]/g, "-")}.webp`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      const a = document.createElement("a");
      a.href = detail.image_url;
      a.download = `${detail.title.replace(/[/\\?%*:|"<>]/g, "-")}.webp`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
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

  const handleLike = async () => {
    if (!imageId || !session?.user) return;
    setLikeLoading(true);
    try {
      const res = await fetch(`/api/images/${imageId}/like`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              likedByMe: data.liked,
              likeCount: data.likeCount ?? prev.likeCount,
            }
          : null
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLikeLoading(false);
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
          <div className="py-24 text-center text-zinc-500 dark:text-zinc-200">이미지를 불러올 수 없습니다.</div>
        ) : (
          <>
            <div className="flex flex-1 flex-col overflow-y-auto md:overflow-hidden">
              <div className="flex flex-1 min-h-0 flex-col overflow-hidden md:flex-row">
                <div
                  className={`flex min-w-0 shrink-0 items-center justify-center bg-zinc-100 p-4 dark:bg-zinc-950 md:min-h-0 md:flex-1 ${
                    editMode ? "min-h-[12vh] md:min-h-0" : "min-h-[40vh] flex-1 md:min-h-0"
                  }`}
                >
                  {detail.link ? (
                    <a
                      href={detail.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={detail.image_url}
                        alt={detail.title}
                        className={`max-w-full object-contain transition-opacity hover:opacity-90 ${
                          editMode ? "max-h-[15vh] md:max-h-[70vh]" : "max-h-[50vh] md:max-h-[70vh]"
                        }`}
                      />
                    </a>
                  ) : (
                    <img
                      src={detail.image_url}
                      alt={detail.title}
                      className={`max-w-full object-contain ${
                        editMode ? "max-h-[15vh] md:max-h-[70vh]" : "max-h-[50vh] md:max-h-[70vh]"
                      }`}
                    />
                  )}
                </div>
                <div className="flex w-full flex-col overflow-y-auto border-t border-zinc-200 dark:border-zinc-800 md:w-96 md:min-w-[24rem] md:border-t-0 md:border-l">
                  <div className="flex items-start justify-between p-4">
                    <div>
                      <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                        {detail.title}
                      </h2>
                      {detail.author && (
                        <p className="mt-0.5 text-[11px] font-normal">
                          {detail.authorId ? (
                            <Link
                              href={`/profile/${detail.authorId}`}
                              className="text-zinc-400 transition-colors hover:text-zinc-700 hover:underline dark:text-zinc-200 dark:hover:text-zinc-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              by {detail.author}
                            </Link>
                          ) : (
                            <span className="text-zinc-400 dark:text-zinc-200">by {detail.author}</span>
                          )}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="min-h-[44px] min-w-[44px] -m-2 flex items-center justify-center rounded p-2 text-zinc-500 transition-all duration-200 hover:bg-zinc-100 hover:text-zinc-700 hover:scale-110 active:scale-95 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                      aria-label="닫기"
                    >
                      <CloseIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
                    {editMode ? (
                      <div className="space-y-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-200">제목</label>
                          <input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full rounded border border-zinc-200 px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-800"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-200">설명</label>
                          <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            rows={3}
                            className="w-full rounded border border-zinc-200 px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-800"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-200">링크</label>
                          <input
                            value={editLink}
                            onChange={(e) => setEditLink(e.target.value)}
                            className="w-full rounded border border-zinc-200 px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-800"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-200">태그</label>
                          <TagAutocomplete
                            value={editTags}
                            onChange={setEditTags}
                            placeholder="쉼표로 구분"
                            className="w-full rounded border border-zinc-200 px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-800"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        {detail.description && (
                          <p className="text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-200">
                            {detail.description}
                          </p>
                        )}
                        {detail.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {detail.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex-1 border-t border-zinc-200 p-4 dark:border-zinc-800">
                    <h3 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-100">
                      댓글 ({detail.comments.length})
                    </h3>
                    <div className="mb-4 max-h-40 space-y-2 overflow-y-auto">
                      {detail.comments.length === 0 ? (
                        <p className="text-sm text-zinc-500 dark:text-zinc-200">아직 댓글이 없습니다.</p>
                      ) : (
                        detail.comments.map((c) => (
                          <div
                            key={c.id}
                            className="rounded-lg bg-zinc-50 p-2 text-sm dark:bg-zinc-800/50"
                          >
                            <p className="text-zinc-900 dark:text-zinc-100">{c.content}</p>
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-200">
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
                        className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
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

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleDownload}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg p-3 text-zinc-600 transition-all duration-200 hover:bg-zinc-100 hover:text-zinc-800 active:scale-95 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                        aria-label="다운로드"
                      >
                        <DownloadIcon className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleLike}
                        disabled={likeLoading || !session?.user}
                        className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg p-3 transition-all duration-200 active:scale-95 disabled:opacity-50 ${
                          detail?.likedByMe
                            ? "text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                            : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                        }`}
                        aria-label={detail?.likedByMe ? "좋아요 취소" : "좋아요"}
                        title={detail?.likedByMe ? "좋아요 취소" : "좋아요"}
                      >
                        <HeartIcon className="h-5 w-5 shrink-0" filled={detail?.likedByMe} />
                      </button>
                      {session && (
                        <button
                          type="button"
                          onClick={() => setBoardAddOpen(true)}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg p-3 text-zinc-600 transition-all duration-200 hover:bg-zinc-100 hover:text-zinc-800 active:scale-95 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                          aria-label="보드에 추가"
                        >
                          <BookmarkIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                    {detail.isAuthor && (
                      <div className="flex items-center gap-2">
                        {editMode && (
                          <button
                            type="button"
                            onClick={() => setEditMode(false)}
                            className="rounded-lg px-3 py-2 text-sm text-zinc-500 transition-all duration-200 hover:bg-zinc-100 active:scale-95 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                          >
                            취소
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => (editMode ? handleSaveEdit() : setEditMode(true))}
                          disabled={saveLoading}
                          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition-all duration-200 hover:bg-zinc-100 active:scale-95 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 disabled:opacity-50"
                        >
                          {editMode ? (saveLoading ? "저장 중..." : "저장") : "편집"}
                        </button>
                        <button
                          type="button"
                          onClick={handleDelete}
                          disabled={deleteLoading}
                          className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-all duration-200 hover:bg-red-50 active:scale-95 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-50"
                        >
                          {deleteLoading ? "삭제 중..." : "삭제"}
                        </button>
                      </div>
                    )}
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

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function HeartIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg className={className} fill={filled ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}

function BookmarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  );
}
