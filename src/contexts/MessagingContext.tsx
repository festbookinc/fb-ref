"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface MessagingContextType {
  conversationId: string | null;
  isOpen: boolean;
  openChat: (conversationId: string) => void;
  closeChat: () => void;
}

const MessagingContext = createContext<MessagingContextType>({
  conversationId: null,
  isOpen: false,
  openChat: () => {},
  closeChat: () => {},
});

export function MessagingProvider({ children }: { children: ReactNode }) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openChat = (convId: string) => {
    setConversationId(convId);
    setIsOpen(true);
  };

  const closeChat = () => {
    setIsOpen(false);
  };

  return (
    <MessagingContext.Provider value={{ conversationId, isOpen, openChat, closeChat }}>
      {children}
    </MessagingContext.Provider>
  );
}

export function useMessaging() {
  return useContext(MessagingContext);
}
