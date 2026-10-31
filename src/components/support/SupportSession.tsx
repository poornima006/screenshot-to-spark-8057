import { createContext, useContext, useRef, useState, type Dispatch, type SetStateAction, type ReactNode } from "react";
import type { ChatMessage } from "./MessageBubble";

export const createWelcomeMessage = (): ChatMessage => ({
  id: "welcome", role: "assistant", text: "Hi! Welcome to ShopEase. How can I help you today?", time: "",
});

interface SupportSession {
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  getConversationId: () => string;
}
const SessionContext = createContext<SupportSession | null>(null);

export function SupportSessionProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([createWelcomeMessage()]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const conversationId = useRef<string | null>(null);
  const getConversationId = () => {
    if (!conversationId.current) conversationId.current = crypto.randomUUID();
    return conversationId.current;
  };
  return <SessionContext.Provider value={{ messages, setMessages, loading, setLoading, input, setInput, getConversationId }}>{children}</SessionContext.Provider>;
}

export function useSupportSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("Support session provider is required");
  return session;
}