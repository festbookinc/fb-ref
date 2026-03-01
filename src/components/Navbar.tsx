"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import { LoginModal } from "./LoginModal";
import { UploadModal } from "./UploadModal";
import { TagModal } from "./TagModal";
import { useRefresh } from "@/contexts/RefreshContext";
import { useSearch } from "@/contexts/SearchContext";
import { useUpload } from "@/contexts/UploadContext";

export function Navbar() {
  const pathname = usePathname();
  const { refresh } = useRefresh() ?? {};
  const { query, setQuery, selectedTags, setSelectedTags } = useSearch() ?? {};
  const { openUpload, clearPendingFiles } = useUpload() ?? {};
  const [mounted, setMounted] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [mypageOpen, setMypageOpen] = useState(false);
  const mypageRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const { data: session, status } = useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handler = () => setUploadModalOpen(true);
    window.addEventListener("open-upload-modal", handler);
    return () => window.removeEventListener("open-upload-modal", handler);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mypageRef.current && !mypageRef.current.contains(e.target as Node)) {
        setMypageOpen(false);
      }
    };
    if (mypageOpen) document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [mypageOpen]);

  return (
    <>
      <nav className="sticky top-0 z-50 bg-background">
        <div className="mx-auto flex h-14 max-w-[1920px] items-center gap-2 px-4 sm:gap-4 sm:px-6">
          {/* 로고 */}
          <Link
            href="/"
            onClick={(e) => {
              if (pathname === "/") {
                e.preventDefault();
                refresh?.();
              }
            }}
            className="shrink-0 text-lg font-semibold tracking-tight text-zinc-700 transition-colors duration-200 hover:text-zinc-500 active:scale-95 dark:text-zinc-100 dark:hover:text-zinc-100"
          >
            FB Ref.
          </Link>

          {/* 검색창 + Tag */}
          <div className="flex flex-1 max-w-xl items-center gap-2">
            <input
              type="search"
              value={query ?? ""}
              onChange={(e) => setQuery?.(e.target.value)}
              placeholder="제목, 태그, 작성자, 댓글 검색..."
              className="w-full rounded-lg border border-zinc-200 bg-zinc-100 px-4 py-2 text-sm text-zinc-700 placeholder-zinc-500 transition-colors focus:border-zinc-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500"
              aria-label="검색"
            />
            <button
              type="button"
              onClick={() => setTagModalOpen(true)}
              className={`shrink-0 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold transition-all duration-200 dark:border-zinc-600 ${
                selectedTags?.length
                  ? "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100"
                  : "bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              }`}
              aria-label="태그 선택"
            >
              Tag {selectedTags?.length ? `(${selectedTags.length})` : ""}
            </button>
          </div>

          {/* 오른쪽: + 버튼 + 로그인/마이페이지 */}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {/* 추가 버튼 */}
            <button
              type="button"
              onClick={() => (session ? openUpload?.() ?? setUploadModalOpen(true) : setLoginModalOpen(true))}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-lg font-medium text-white transition-all duration-200 hover:bg-zinc-700 hover:scale-105 active:scale-95 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              aria-label="추가"
            >
              +
            </button>

            {/* 다크 모드 토글 */}
            {mounted && (
              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="shrink-0 rounded-lg p-2 text-zinc-600 transition-all duration-200 hover:bg-zinc-200 hover:text-zinc-800 hover:scale-105 active:scale-95 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
              >
                {theme === "dark" ? (
                  <SunIcon className="h-5 w-5" />
                ) : (
                  <MoonIcon className="h-5 w-5" />
                )}
              </button>
            )}

            {/* 로그인 / 마이페이지 드롭다운 */}
            {status === "loading" ? (
              <div className="h-9 w-20 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
            ) : session ? (
              <div className="relative" ref={mypageRef}>
                <button
                  type="button"
                  onClick={() => setMypageOpen((prev) => !prev)}
                  className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 transition-all duration-200 hover:bg-zinc-200 hover:text-zinc-600 active:scale-95 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  aria-label="마이페이지"
                  aria-expanded={mypageOpen}
                >
                  마이페이지
                  <ChevronDownIcon className={`h-4 w-4 transition-transform ${mypageOpen ? "rotate-180" : ""}`} />
                </button>
                {mypageOpen && (
                  <div className="absolute right-0 top-full z-50 mt-1 min-w-[140px] rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                    <Link
                      href="/mypage"
                      onClick={() => setMypageOpen(false)}
                      className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    >
                      마이페이지
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setMypageOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setLoginModalOpen(true)}
                className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 transition-all duration-200 hover:bg-zinc-200 hover:text-zinc-600 active:scale-95 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                aria-label="로그인"
              >
                로그인
              </button>
            )}
          </div>
        </div>
      </nav>

      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
      <TagModal
        isOpen={tagModalOpen}
        onClose={() => setTagModalOpen(false)}
        selectedTags={selectedTags ?? []}
        onApply={(tags) => {
          setSelectedTags?.(tags);
          setTagModalOpen(false);
        }}
      />
      {session && (
        <UploadModal
          isOpen={uploadModalOpen}
          onClose={() => {
            setUploadModalOpen(false);
            clearPendingFiles?.();
          }}
          onSuccess={() => {
            setUploadModalOpen(false);
            clearPendingFiles?.();
            refresh?.();
          }}
        />
      )}
    </>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}
