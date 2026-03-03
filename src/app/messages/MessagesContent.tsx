"use client";

import Image from "next/image";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Conversation {
  id: string;
  partner: { id: string; name: string; image: string | null };
  lastMessage: { content: string; created_at: string } | null;
  unreadCount: number;
  last_message_at: string;
}

export function MessagesContent() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/messages")
      .then((r) => r.json())
      .then((data) => setConversations(data.conversations || []))
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-600 dark:border-t-zinc-400" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 py-12 text-center text-sm text-zinc-500 dark:border-zinc-600 dark:text-zinc-200">
        아직 대화가 없습니다.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {conversations.map((conv) => (
        <li key={conv.id}>
          <Link
            href={`/messages/${conv.id}`}
            className="flex items-center gap-4 py-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-lg px-2"
          >
            {conv.partner.image ? (
              <Image
                src={conv.partner.image}
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                {conv.partner.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                  {conv.partner.name}
                </p>
                <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
                  {formatDate(conv.last_message_at)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                  {conv.lastMessage?.content ?? "대화를 시작해 보세요"}
                </p>
                {conv.unreadCount > 0 && (
                  <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-zinc-900 px-1.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function formatDate(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60_000) return "방금";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}분 전`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}시간 전`;
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}
