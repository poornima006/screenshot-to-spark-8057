import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { History, Send, Trash2, UserRound, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useServerFn } from "@tanstack/react-start";
import { MessageBubble, TypingIndicator, type ChatMessage } from "@/components/support/MessageBubble";
import { HUMAN_HANDOFF_MESSAGE } from "@/lib/support/demo-responder";
import { askSupport, AI_UNAVAILABLE_MESSAGE } from "@/lib/support/chat.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ShopEase AI Customer Support" },
      { name: "description", content: "Ask ShopEase about shipping, returns, refunds, payments and cancellations." },
      { property: "og:title", content: "ShopEase AI Customer Support" },
      { property: "og:description", content: "Customer support chat for ShopEase shoppers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SupportPage,
});

const SUGGESTIONS = [
  "What is your shipping policy?",
  "How can I return a product?",
  "When will I receive my refund?",
  "Which payment methods do you accept?",
  "Can I cancel my order?",
];

const WELCOME = "Hi! Welcome to ShopEase. How can I help you today?";
const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const uid = () => Math.random().toString(36).slice(2);
const welcome = (): ChatMessage => ({ id: "welcome", role: "assistant", text: WELCOME, time: "" });

function SupportPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([welcome()]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const askSupportFn = useServerFn(askSupport);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    const customerMessage: ChatMessage = { id: uid(), role: "customer", text: q, time: now() };
    const history = [...messages, customerMessage]
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "customer" | "assistant", text: m.text }));
    setMessages((m) => [...m, customerMessage]);
    setInput("");
    setLoading(true);
    try {
      const result = await askSupportFn({ data: { messages: history.slice(-50) } });
      const reply = result.ok ? result.reply : result.error;
      setMessages((m) => [...m, {
        id: uid(), role: "assistant", text: reply, time: now(),
        sources: result.ok ? result.sources : [],
      }]);
    } catch {
      setMessages((m) => [...m, { id: uid(), role: "assistant", text: AI_UNAVAILABLE_MESSAGE, time: now() }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const talkToHuman = () =>
    setMessages((m) => [...m, { id: uid(), role: "system", text: HUMAN_HANDOFF_MESSAGE, time: now() }]);

  const customerQuestions = messages.filter((m) => m.role === "customer");

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-lg font-extrabold text-primary-foreground">
              S
            </div>
            <span className="text-xl font-extrabold tracking-tight">
              Shop<span className="text-primary">Ease</span>
            </span>
          </div>
          <Button variant="outline" onClick={talkToHuman} className="rounded-full">
            <UserRound /> Talk to Human
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_300px]">
        <section className="flex h-[calc(100dvh-7.5rem)] min-h-[520px] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h1 className="text-lg font-bold sm:text-xl">AI Customer Support</h1>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Info className="h-3 w-3" /> Live AI — answers use ShopEase's policy reference; no order data connected
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" disabled={messages.length <= 1}>
                  <Trash2 /> <span className="hidden sm:inline">Clear chat</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear this conversation?</AlertDialogTitle>
                  <AlertDialogDescription>All messages from this session will be removed.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => setMessages([welcome()])}>Clear</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={endRef} />
          </div>

          <div className="border-t border-border bg-muted/40 px-4 py-3 sm:px-6">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={loading}
                  className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-accent-foreground transition-colors hover:bg-accent disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex gap-2"
            >
              <Input
                ref={inputRef}
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your question here..."
                className="h-11 rounded-full bg-card px-4"
                aria-label="Your question"
              />
              <Button type="submit" disabled={!input.trim() || loading} className="h-11 rounded-full px-5">
                <Send /> <span className="hidden sm:inline">Send</span>
              </Button>
            </form>
          </div>
        </section>

        <aside className="rounded-3xl border border-border bg-card p-5 shadow-soft lg:h-fit">
          <h2 className="flex items-center gap-2 font-bold">
            <History className="h-4 w-4 text-primary" /> Conversation history
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">This session only — not saved after you leave.</p>
          {customerQuestions.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Your questions will appear here.</p>
          ) : (
            <ol className="mt-4 space-y-2">
              {customerQuestions.map((m) => (
                <li key={m.id} className="rounded-xl bg-secondary px-3 py-2 text-sm">
                  <span className="block text-secondary-foreground">{m.text}</span>
                  <span className="text-xs text-muted-foreground">{m.time}</span>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </main>
    </div>
  );
}
