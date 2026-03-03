"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMessaging } from "@/contexts/MessagingContext";

interface AuthorLinkProps {
  author: string;
  authorId?: string | null;
  className?: string;
}

export function AuthorLink({ author, authorId, className }: AuthorLinkProps) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const dropdownRef = useRef<HTMLSpanElement>(null);
  const router = useRouter();
  const { data: session } = useSession();
  // MessagingContext에서 myProfileId를 가져와 경쟁 조건 없이 1회만 fetch됨
  const { openChat, myProfileId } = useMessaging();

  const isOwn = !!authorId && myProfileId === authorId;

  useEffect(() => {
    setMounted(true);
  }, []);

  // 드롭다운 위치 계산
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      zIndex: 9999,
    });
  }, [open]);

  // 외부 클릭 시 닫기 (트리거 + 포탈 드롭다운 둘 다 체크)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const inTrigger = triggerRef.current?.contains(e.target as Node);
      const inDropdown = dropdownRef.current?.contains(e.target as Node);
      if (!inTrigger && !inDropdown) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSendMessage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!authorId) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: authorId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "실패");
      setOpen(false);
      openChat(data.conversationId);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  if (!authorId) {
    return (
      <span className={`text-xs text-zinc-600 dark:text-zinc-200 ${className ?? ""}`}>
        by {author}
      </span>
    );
  }

  const dropdown = (
    <span
      ref={dropdownRef}
      style={dropdownStyle}
      className="flex min-w-[140px] flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
      onClick={(e) => e.stopPropagation()}
    >
      {session && !isOwn && (
        <span
          role="button"
          tabIndex={0}
          onClick={handleSendMessage}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleSendMessage(e as unknown as React.MouseEvent); }}
          aria-disabled={sending}
          className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 aria-disabled:opacity-50 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          <MessageIcon className="h-4 w-4 shrink-0" />
          {sending ? "이동 중..." : "메시지 보내기"}
        </span>
      )}
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(false);
          router.push(`/profile/${authorId}`);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.stopPropagation();
            setOpen(false);
            router.push(`/profile/${authorId}`);
          }
        }}
        className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        <PersonIcon className="h-4 w-4 shrink-0" />
        페이지 보기
      </span>
    </span>
  );

  return (
    <span className="relative inline-block" ref={triggerRef}>
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.stopPropagation();
            setOpen((prev) => !prev);
          }
        }}
        className={`cursor-pointer text-xs text-zinc-600 transition-colors hover:text-zinc-900 hover:underline dark:text-zinc-200 dark:hover:text-zinc-100 ${className ?? ""}`}
      >
        by {author}
      </span>

      {open && mounted && createPortal(dropdown, document.body)}
    </span>
  );
}

function MessageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.83L3 20l1.04-3.63A7.6 7.6 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function PersonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
