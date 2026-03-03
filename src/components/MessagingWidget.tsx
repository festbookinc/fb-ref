"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useMessaging } from "@/contexts/MessagingContext";

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

export function MessagingWidget() {
  const { conversationId, isOpen, closeChat } = useMessaging();
  const [messages, setMessages] = useState<Message[]>([]);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
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

  useEffect(() => {
    if (!isOpen || !conversationId) return;
    setLoading(true);
    setMessages([]);
    setPartner(null);
    fetchMessages();
  }, [isOpen, conversationId, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isOpen || !conversationId) return;
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [isOpen, conversationId, fetchMessages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sending || !conversationId) return;
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

  if (!isOpen || !conversationId) return null;

  return (
    <div className="fixed bottom-[72px] right-3 z-[60] flex h-[460px] w-[calc(100vw-1.5rem)] flex-col rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-950 sm:w-[360px] md:bottom-6">
      {/* 헤더 */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div className="flex min-w-0 items-center gap-2">
          {partner ? (
            <>
              {partner.image ? (
                <img src={partner.image} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                  {partner.name.charAt(0)}
                </div>
              )}
              <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {partner.name}
              </span>
            </>
          ) : (
            <span className="text-sm text-zinc-400">로딩 중...</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {partner && conversationId && (
            <Link
              href={`/messages/${conversationId}`}
              onClick={closeChat}
              className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              title="전체 화면으로 보기"
            >
              <ExpandIcon className="h-4 w-4" />
            </Link>
          )}
          <button
            onClick={closeChat}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            aria-label="닫기"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
        {loading ? (
          <div className="flex justify-center pt-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
          </div>
        ) : (
          <>
            {messages.length === 0 && !loading && (
              <p className="pt-6 text-center text-sm text-zinc-400 dark:text-zinc-500">
                첫 메시지를 보내 보세요!
              </p>
            )}
            {messages.map((msg) => {
              const isMe = msg.sender_id === myId;
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      isMe
                        ? "rounded-br-sm bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "rounded-bl-sm bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    <p
                      className={`mt-0.5 text-[10px] ${
                        isMe ? "text-zinc-400 dark:text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      {formatTime(msg.created_at)}
                      {isMe && msg.read_at && " · 읽음"}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* 입력창 */}
      <form
        onSubmit={handleSend}
        className="flex shrink-0 items-end gap-2 border-t border-zinc-200 px-3 py-2.5 dark:border-zinc-800"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지 입력... (Enter로 전송)"
          rows={1}
          className="max-h-24 min-h-[38px] flex-1 resize-none overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
          style={{ lineHeight: "1.4" }}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white transition-all hover:bg-zinc-700 active:scale-95 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
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

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );
}
