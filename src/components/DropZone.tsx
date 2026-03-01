"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useUpload } from "@/contexts/UploadContext";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];

function isImageFile(file: File): boolean {
  return IMAGE_TYPES.includes(file.type);
}

export function DropZone({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const openUpload = useUpload()?.openUpload;
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!session || !openUpload) return;
    const hasImage = Array.from(e.dataTransfer.items).some((item) => {
      const f = item.getAsFile();
      return f && isImageFile(f);
    });
    if (hasImage) setIsDragging(true);
  }, [session, openUpload]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!session || !openUpload) return;
    const files = Array.from(e.dataTransfer.files).filter(isImageFile);
    if (files.length > 0) openUpload(files);
  }, [session, openUpload]);

  return (
    <div
      className="relative min-h-[200px]"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      {isDragging && (
        <div
          className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center rounded-lg border-2 border-dashed border-zinc-400 bg-zinc-100/90 animate-modal-backdrop dark:border-zinc-500 dark:bg-zinc-900/90"
          aria-hidden
        >
          <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300">
            이미지를 여기에 놓으세요
          </p>
        </div>
      )}
    </div>
  );
}
