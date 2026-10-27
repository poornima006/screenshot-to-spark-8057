import { Headset, User } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  role: "customer" | "assistant" | "system";
  text: string;
  time: string;
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "system") {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-border bg-accent px-4 py-2 text-center text-sm text-accent-foreground">
        {message.text}
      </div>
    );
  }
  const mine = message.role === "customer";
  return (
    <div className={cn("flex items-end gap-2", mine && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          mine ? "bg-navy text-navy-foreground" : "bg-brand text-primary-foreground",
        )}
      >
        {mine ? <User className="h-4 w-4" /> : <Headset className="h-4 w-4" />}
      </div>
      <div className={cn("max-w-[80%] sm:max-w-[70%]", mine && "text-right")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-left text-[15px] leading-relaxed",
            mine
              ? "rounded-br-sm bg-primary text-primary-foreground"
              : "rounded-bl-sm bg-secondary text-secondary-foreground",
          )}
        >
          {message.text}
        </div>
        <span className="mt-1 block px-1 text-xs text-muted-foreground">{message.time}</span>
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex items-end gap-2" aria-label="Assistant is typing">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-primary-foreground">
        <Headset className="h-4 w-4" />
      </div>
      <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-secondary px-4 py-3.5">
        {[0, 150, 300].map((d) => (
          <span
            key={d}
            className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
            style={{ animationDelay: `${d}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
