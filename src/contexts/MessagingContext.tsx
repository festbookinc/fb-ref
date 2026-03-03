"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useSession } from "next-auth/react";

interface MessagingContextType {
  conversationId: string | null;
  isOpen: boolean;
  myProfileId: string | null;
  openChat: (conversationId: string) => void;
  closeChat: () => void;
}

const MessagingContext = createContext<MessagingContextType>({
  conversationId: null,
  isOpen: false,
  myProfileId: null,
  openChat: () => {},
  closeChat: () => {},
});

export function MessagingProvider({ children }: { children: ReactNode }) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const { data: session } = useSession();

  // 로그인 시 내 프로필 ID를 앱 전체에서 1회만 fetch (AuthorLink 경쟁 조건 해결)
  useEffect(() => {
    const email = session?.user?.email;
    if (!email) {
      setMyProfileId(null);
      return;
    }
    fetch("/api/profile/me")
      .then((r) => r.json())
      .then((d) => setMyProfileId(d.id ?? null))
      .catch(() => setMyProfileId(null));
  }, [session?.user?.email]);

  const openChat = (convId: string) => {
    setConversationId(convId);
    setIsOpen(true);
  };

  const closeChat = () => {
    setIsOpen(false);
  };

  return (
    <MessagingContext.Provider value={{ conversationId, isOpen, myProfileId, openChat, closeChat }}>
      {children}
    </MessagingContext.Provider>
  );
}

export function useMessaging() {
  return useContext(MessagingContext);
}
