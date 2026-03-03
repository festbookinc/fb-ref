"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

interface Partner {
  id: string;
  name: string;
  image: string | null;
}

export function ChatContent({ conversationId }: { conversationId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages/${conversationId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages(data.messages);
      setPartner(data.partner);
      setMyId(data.myId);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // 페이지 진입 시 읽음 처리 1회 (폴링과 분리)
  useEffect(() => {
    fetch(`/api/messages/${conversationId}`, { method: "PATCH" }).catch(() => {});
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // 새 메시지 오면 스크롤 하단 이동
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 폴링: 5초마다 새 메시지 확인
  useEffect(() => {
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/messages/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages((prev) => [...prev, data.message]);
      setInput("");
      textareaRef.current?.focus();
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      {/* 상대방 헤더 */}
      {partner && (
        <div className="flex items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          {partner.image ? (
            <Image src={partner.image} alt="" width={36} height={36} className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-200 text-sm font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
              {partner.name.charAt(0)}
            </div>
          )}
          <Link
            href={`/profile/${partner.id}`}
            className="font-medium text-zinc-900 transition-colors hover:underline dark:text-zinc-100"
          >
            {partner.name}
          </Link>
        </div>
      )}

      {/* 메시지 목록 */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-zinc-400 dark:text-zinc-500">
            첫 메시지를 보내 보세요!
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === myId;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  isMe
                    ? "rounded-br-sm bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "rounded-bl-sm bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <p className={`mt-1 text-[10px] ${isMe ? "text-zinc-400 dark:text-zinc-600" : "text-zinc-400"}`}>
                  {formatTime(msg.created_at)}
                  {isMe && msg.read_at && " · 읽음"}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <form
        onSubmit={handleSend}
        className="flex items-end gap-2 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지 입력... (Enter로 전송, Shift+Enter 줄바꿈)"
          rows={1}
          className="max-h-32 min-h-[44px] flex-1 resize-none overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
          style={{ lineHeight: "1.5" }}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white transition-all hover:bg-zinc-700 active:scale-95 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          aria-label="전송"
        >
          <SendIcon className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );
}
