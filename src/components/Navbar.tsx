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
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [mypageOpen, setMypageOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const mypageRef = useRef<HTMLDivElement>(null);
  const mypageRefMobile = useRef<HTMLDivElement>(null);
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

  // 읽지 않은 메시지 수 폴링 (30초 간격)
  useEffect(() => {
    if (!session) {
      setUnreadCount(0);
      return;
    }
    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/messages/unread");
        const data = await res.json();
        setUnreadCount(data.unread ?? 0);
      } catch {
        // 무시
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const inDesktop = mypageRef.current?.contains(target);
      const inMobile = mypageRefMobile.current?.contains(target);
      if (!inDesktop && !inMobile) setMypageOpen(false);
    };
    if (mypageOpen) document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [mypageOpen]);

  return (
    <>
      {/* 상단: 데스크톱만 표시, 모바일에서는 공간 없음 */}
      {/* 상단 네비: 데스크톱만 */}
      <nav className="sticky top-0 z-50 hidden bg-background md:block">
        <div className="mx-auto flex h-14 max-w-[1920px] items-center gap-2 px-4 sm:gap-4 sm:px-6">
          {/* 로고 + 검색 + Tag + 추가 + 다크모드 + 마이페이지 */}
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

          {/* 오른쪽: + 버튼 + 다크모드 + 로그인/마이페이지 */}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {/* 추가 버튼 */}
            <button
              type="button"
              onClick={() => (session ? openUpload?.() ?? setUploadModalOpen(true) : setLoginModalOpen(true))}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-lg font-medium text-white transition-all duration-200 hover:bg-zinc-700 hover:scale-105 active:scale-95 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 sm:h-9 sm:w-9"
              aria-label="추가"
            >
              +
            </button>

            {/* 다크 모드 토글 */}
            {mounted && (
              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg p-2 text-zinc-600 transition-all duration-200 hover:bg-zinc-200 hover:text-zinc-800 hover:scale-105 active:scale-95 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 sm:min-h-0 sm:min-w-0"
                aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
              >
                {theme === "dark" ? (
                  <SunIcon className="h-5 w-5" />
                ) : (
                  <MoonIcon className="h-5 w-5" />
                )}
              </button>
            )}

            {/* 메시지 아이콘 (로그인 시) */}
            {session && (
              <Link
                href="/messages"
                className="relative flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg p-2 text-zinc-600 transition-all duration-200 hover:bg-zinc-200 hover:text-zinc-800 hover:scale-105 active:scale-95 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 sm:min-h-0 sm:min-w-0"
                aria-label="메시지"
              >
                <MessageIcon className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
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

      {/* 모바일: 하단 고정 4개 아이콘 */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex min-h-[56px] items-center justify-evenly border-t border-zinc-200 bg-background px-2 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
        aria-label="하단 메뉴"
      >
        <Link
          href="/"
          onClick={(e) => {
            if (pathname === "/") {
              e.preventDefault();
              refresh?.();
            }
          }}
          className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center text-zinc-600 transition-colors hover:text-zinc-800 active:scale-95 dark:text-zinc-200 dark:hover:text-zinc-100"
          aria-label="홈"
        >
          <HomeIcon className="h-6 w-6" />
        </Link>
        <button
          type="button"
          onClick={() => setSearchModalOpen(true)}
          className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center text-zinc-600 transition-colors hover:text-zinc-800 active:scale-95 dark:text-zinc-200 dark:hover:text-zinc-100"
          aria-label="검색"
        >
          <SearchIcon className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={() => (session ? openUpload?.() ?? setUploadModalOpen(true) : setLoginModalOpen(true))}
          className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full bg-zinc-900 text-lg font-medium text-white transition-colors hover:bg-zinc-700 active:scale-95 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          aria-label="추가"
        >
          +
        </button>
        {session && (
          <Link
            href="/messages"
            className="relative flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center text-zinc-600 transition-colors hover:text-zinc-800 active:scale-95 dark:text-zinc-200 dark:hover:text-zinc-100"
            aria-label="메시지"
          >
            <MessageIcon className="h-6 w-6" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
        )}
        {status === "loading" ? (
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
        ) : session ? (
          <div className="relative" ref={mypageRefMobile}>
            <button
              type="button"
              onClick={() => setMypageOpen((prev) => !prev)}
              className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center text-zinc-600 transition-colors hover:text-zinc-800 active:scale-95 dark:text-zinc-200 dark:hover:text-zinc-100"
              aria-label="마이페이지"
              aria-expanded={mypageOpen}
            >
              <ProfileIcon className="h-6 w-6" />
            </button>
            {mypageOpen && (
              <div className="absolute bottom-full left-1/2 z-50 mb-1 min-w-[140px] -translate-x-1/2 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
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
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center text-zinc-600 transition-colors hover:text-zinc-800 active:scale-95 dark:text-zinc-200 dark:hover:text-zinc-100"
            aria-label="로그인"
          >
            <ProfileIcon className="h-6 w-6" />
          </button>
        )}
      </nav>

      {/* 모바일 검색 모달 */}
      {searchModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-white dark:bg-zinc-900 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="검색"
        >
          <div className="flex items-center gap-2 border-b border-zinc-200 p-4 dark:border-zinc-800">
            <input
              type="search"
              value={query ?? ""}
              onChange={(e) => setQuery?.(e.target.value)}
              placeholder="제목, 태그, 작성자, 댓글 검색..."
              className="min-h-[44px] flex-1 rounded-lg border border-zinc-200 bg-zinc-100 px-4 py-2 text-base text-zinc-700 placeholder-zinc-500 focus:border-zinc-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
              autoFocus
              aria-label="검색"
            />
            <button
              type="button"
              onClick={() => {
                setSearchModalOpen(false);
                setTagModalOpen(true);
              }}
              className={`min-h-[44px] shrink-0 rounded-lg border px-4 py-2 text-sm font-semibold transition-all dark:border-zinc-600 ${
                selectedTags?.length
                  ? "border-zinc-300 bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100"
                  : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              }`}
            >
              Tag {selectedTags?.length ? `(${selectedTags.length})` : ""}
            </button>
            <button
              type="button"
              onClick={() => setSearchModalOpen(false)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
              aria-label="닫기"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <div
            className="flex-1 overflow-y-auto p-4"
            onClick={() => setSearchModalOpen(false)}
          >
            <p className="text-center text-sm text-zinc-500 dark:text-zinc-200">
              검색어 입력 후 목록이 자동으로 필터됩니다.
            </p>
          </div>
        </div>
      )}

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

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function MessageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.83L3 20l1.04-3.63A7.6 7.6 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}
