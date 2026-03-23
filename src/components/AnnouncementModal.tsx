"use client";

import { useEffect, useState } from "react";

// ─── 공지 설정 ────────────────────────────────────────────────────────────────
// 새 공지를 낼 때는 ANNOUNCEMENT_ID만 바꾸면 모든 사용자에게 다시 표시됩니다.
const ANNOUNCEMENT_ID = "announcement-v1";

const ANNOUNCEMENT_TITLE = "새로운 기능을 소개합니다 🎉";

const ANNOUNCEMENT_ITEMS: string[] = [
  "메인 페이지에서 각 이미지를 선택하여 다운로드하는 기능이 생겼어요 📥",
  "파일을 한 번에 올리는 기능도 생겼답니다 🚀",
  "모바일에서 이미지가 작게 보이는 문제도 해결했어요 📱",
];
// ─────────────────────────────────────────────────────────────────────────────

export function AnnouncementModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem("dismissed_announcement");
      if (dismissed !== ANNOUNCEMENT_ID) {
        setVisible(true);
      }
    } catch {
      // 프라이빗 브라우저 등 localStorage 접근 불가 시 무시
    }
  }, []);

  const handleClose = () => setVisible(false);

  const handleDismiss = () => {
    try {
      localStorage.setItem("dismissed_announcement", ANNOUNCEMENT_ID);
    } catch {}
    setVisible(false);
  };

  if (!visible || ANNOUNCEMENT_ITEMS.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/50 p-4 pt-20 animate-modal-backdrop"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-title"
    >
      <div
        className="w-full max-w-[480px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl animate-modal-content dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <h2
            id="announcement-title"
            className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
          >
            {ANNOUNCEMENT_TITLE}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            aria-label="닫기"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {/* 본문 */}
        <ul className="space-y-3 px-6 py-5">
          {ANNOUNCEMENT_ITEMS.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">
              <span className="mt-[0.35rem] shrink-0 text-zinc-400 dark:text-zinc-500">·</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        {/* 액션 버튼 */}
        <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={handleDismiss}
            className="text-sm text-zinc-400 underline-offset-2 transition-colors hover:text-zinc-600 hover:underline dark:text-zinc-500 dark:hover:text-zinc-300"
          >
            다시 보지 않기
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
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
