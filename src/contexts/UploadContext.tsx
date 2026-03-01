"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface UploadContextValue {
  openUpload: (files?: File[]) => void;
  pendingFiles: File[] | null;
  clearPendingFiles: () => void;
}

const UploadContext = createContext<UploadContextValue | null>(null);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);

  const openUpload = useCallback((files?: File[]) => {
    setPendingFiles(files && files.length > 0 ? [...files] : null);
    window.dispatchEvent(new CustomEvent("open-upload-modal"));
  }, []);

  const clearPendingFiles = useCallback(() => {
    setPendingFiles(null);
  }, []);

  return (
    <UploadContext.Provider value={{ openUpload, pendingFiles, clearPendingFiles }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  return useContext(UploadContext);
}
