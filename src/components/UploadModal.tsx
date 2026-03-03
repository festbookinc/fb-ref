"use client";

import { useState, useRef, useEffect } from "react";
import { TagAutocomplete } from "./TagAutocomplete";
import { BoardSelectModal } from "./BoardSelectModal";
import { useUpload } from "@/contexts/UploadContext";
import { compressImageForUpload } from "@/lib/compressImage";

function fileNameToTitle(name: string): string {
  const lastDot = name.lastIndexOf(".");
  return lastDot > 0 ? name.slice(0, lastDot) : name;
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const { pendingFiles, clearPendingFiles } = useUpload() ?? {};
  const [mode, setMode] = useState<"file" | "url">("file");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [tags, setTags] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<{ file: File; title: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openFilePicker, setOpenFilePicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedBoardIds, setSelectedBoardIds] = useState<Set<string>>(new Set());
  const [newBoardName, setNewBoardName] = useState("");
  const [boardSelectOpen, setBoardSelectOpen] = useState(false);

  const isMultiFile = files.length > 0;

  useEffect(() => {
    if (mode === "file" && openFilePicker && fileInputRef.current && !isMultiFile) {
      fileInputRef.current.click();
      setOpenFilePicker(false);
    }
  }, [mode, openFilePicker, isMultiFile]);

  useEffect(() => {
    if (isOpen && pendingFiles && pendingFiles.length > 0) {
      setMode("file");
      setFiles(
        pendingFiles.map((f) => ({ file: f, title: fileNameToTitle(f.name) }))
      );
      setFile(null);
      clearPendingFiles?.();
    }
  }, [isOpen, pendingFiles, clearPendingFiles]);

  const reset = () => {
    setTitle("");
    setDescription("");
    setLink("");
    setTags("");
    setImageUrl("");
    setFile(null);
    setFiles([]);
    setError("");
    setOpenFilePicker(false);
    setSelectedBoardIds(new Set());
    setNewBoardName("");
    setBoardSelectOpen(false);
  };

  const getBoardIdsForAdd = async (): Promise<string[]> => {
    let ids = [...selectedBoardIds];
    if (newBoardName.trim()) {
      const createRes = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBoardName.trim() }),
      });
      const createData = await createRes.json();
      if (createRes.ok && createData.board?.id) {
        ids = [createData.board.id, ...ids];
      }
    }
    return ids;
  };

  const addImageToBoards = async (imageId: string, boardIds: string[]) => {
    for (const boardId of boardIds) {
      await fetch(`/api/boards/${boardId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      });
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const updateFileTitle = (index: number, newTitle: string) => {
    setFiles((prev) =>
      prev.map((item, i) => (i === index ? { ...item, title: newTitle } : item))
    );
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isMultiFile) {
        const sharedDesc = description.trim();
        const sharedLink = link.trim();
        const sharedTags = tags.trim();
        const createdIds: string[] = [];
        const errors: string[] = [];

        for (const { file: f, title: t } of files) {
          if (!t.trim()) {
            errors.push(`${f.name}: 제목을 입력해 주세요.`);
            continue;
          }
          const formData = new FormData();
          formData.append("title", t.trim());
          formData.append("description", sharedDesc);
          formData.append("link", sharedLink);
          formData.append("tags", sharedTags);
          const compressedFile = await compressImageForUpload(f);
          formData.append("image", compressedFile);

          const res = await fetch("/api/images/upload", { method: "POST", body: formData });
          const data = await res.json();

          if (!res.ok) {
            errors.push(`${f.name}: ${data.error || "업로드 실패"}`);
          } else if (data.image?.id) {
            createdIds.push(data.image.id);
          }
        }

        if (errors.length > 0) {
          setError(errors.join("\n"));
        }
        if (createdIds.length > 0) {
          const boardIds = await getBoardIdsForAdd();
          for (const imageId of createdIds) {
            await addImageToBoards(imageId, boardIds);
          }
          handleClose();
          onSuccess();
        }
      } else {
        const formData = new FormData();
        formData.append("title", title.trim());
        formData.append("description", description.trim());
        formData.append("link", link.trim());
        formData.append("tags", tags.trim());

        if (mode === "file" && file) {
          const compressedFile = await compressImageForUpload(file);
          formData.append("image", compressedFile);
        } else if (mode === "url" && imageUrl.trim()) {
          formData.append("imageUrl", imageUrl.trim());
        } else {
          setError(mode === "file" ? "이미지 파일을 선택해 주세요." : "이미지 URL을 입력해 주세요.");
          setLoading(false);
          return;
        }

        const res = await fetch("/api/images/upload", { method: "POST", body: formData });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "업로드에 실패했습니다.");
          setLoading(false);
          return;
        }

        if (data.image?.id) {
          const boardIds = await getBoardIdsForAdd();
          await addImageToBoards(data.image.id, boardIds);
        }
        handleClose();
        onSuccess();
      }
    } catch {
      setError("업로드 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-modal-backdrop"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-xl animate-modal-content dark:border-zinc-800 dark:bg-zinc-900 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="upload-modal-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            이미지 추가
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg p-2 text-zinc-500 transition-all duration-200 hover:bg-zinc-100 hover:text-zinc-700 hover:scale-110 active:scale-95 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="닫기"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 업로드 방식 선택 */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setMode("file");
                setOpenFilePicker(true);
              }}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                mode === "file"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              }`}
            >
              파일 업로드
            </button>
            <button
              type="button"
              onClick={() => setMode("url")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                mode === "url"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              }`}
            >
              이미지 링크
            </button>
          </div>

          {mode === "file" ? (
            isMultiFile ? (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-100">
                  이미지 ({files.length}개)<sup className="text-[0.65em] text-red-500">필수</sup>
                </label>
                <div className="max-h-40 overflow-y-auto space-y-2 rounded-lg border border-zinc-200 dark:border-zinc-700 p-2">
                  {files.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateFileTitle(i, e.target.value)}
                        placeholder="제목"
                        className="flex-1 rounded border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                      <span className="shrink-0 truncate max-w-[120px] text-xs text-zinc-500 dark:text-zinc-200">
                        {item.file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="shrink-0 rounded p-1 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                        aria-label="제거"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-100">
                  이미지<sup className="text-[0.65em] text-red-500">필수</sup>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
                  multiple
                  onChange={(e) => {
                    const selected = Array.from(e.target.files ?? []);
                    if (selected.length > 1) {
                      setFiles(selected.map((f) => ({ file: f, title: fileNameToTitle(f.name) })));
                      setFile(null);
                    } else {
                      setFile(selected[0] ?? null);
                      setFiles([]);
                    }
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-lg border border-zinc-200 border-dashed bg-zinc-50 px-3 py-4 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  {file ? file.name : "파일 선택"}
                </button>
                {file && <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-200">{file.name}</p>}
              </div>
            )
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-100">
                이미지 URL<sup className="text-[0.65em] text-red-500">필수</sup>
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          )}

          {!isMultiFile && (
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-100">
                제목<sup className="text-[0.65em] text-red-500">필수</sup>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목을 입력하세요"
                required
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-100">
              설명
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="설명을 입력하세요"
              rows={2}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-100">
              링크
            </label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-100">
              태그 (쉼표 또는 공백으로 구분, 입력 시 자동완성)
            </label>
            <TagAutocomplete
              value={tags}
              onChange={setTags}
              placeholder="그래픽, 레퍼런스, ..."
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <button
            type="button"
            onClick={() => setBoardSelectOpen(true)}
            className="flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
          >
            <span className="font-medium text-zinc-700 dark:text-zinc-100">보드에 추가 (선택)</span>
            {selectedBoardIds.size > 0 || newBoardName.trim() ? (
              <span className="text-zinc-500 dark:text-zinc-200">
                {selectedBoardIds.size + (newBoardName.trim() ? 1 : 0)}개
              </span>
            ) : (
              <span className="text-zinc-400">›</span>
            )}
          </button>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 transition-all duration-200 hover:bg-zinc-100 active:scale-95 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || (!isMultiFile && !title.trim()) || (isMultiFile && files.some((f) => !f.title.trim()))}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-zinc-700 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {loading ? "업로드 중..." : "추가"}
            </button>
          </div>
        </form>
      </div>

      <BoardSelectModal
        isOpen={boardSelectOpen}
        onClose={() => setBoardSelectOpen(false)}
        selectedBoardIds={selectedBoardIds}
        newBoardName={newBoardName}
        onApply={(ids, name) => {
          setSelectedBoardIds(ids);
          setNewBoardName(name);
        }}
      />
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
