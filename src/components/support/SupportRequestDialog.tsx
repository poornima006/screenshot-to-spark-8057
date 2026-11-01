import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Send, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { createSupportTicket } from "@/lib/support/tickets.functions";
import { containsSensitiveData, ticketInputSchema, TICKET_SAVE_ERROR, type SupportTicket } from "@/lib/support/tickets";
import { useSupportSession } from "./SupportSession";
import { useSupportAccount, SupportSignIn } from "./SupportAccount";

export function SupportRequestDialog() {
  const { userId, ready } = useSupportAccount();
  return <SupportRequestForm key={userId ?? "signed-out"} userId={userId} ready={ready} />;
}

function SupportRequestForm({ userId, ready }: { userId: string | null; ready: boolean }) {
  const { messages, setMessages, getConversationId } = useSupportSession();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<SupportTicket | null>(null);
  const requestId = useRef<string | null>(null);
  const conversationId = useRef<string | null>(null);
  const captured = useRef(messages);
  const pendingInput = useRef<unknown>(null);
  const lock = useRef(false);
  const save = useServerFn(createSupportTicket);
  const queryClient = useQueryClient();
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);

  const submit = async () => {
    if (!userId || lock.current) return;
    const data = pendingInput.current ?? { requestId: requestId.current, conversationId: conversationId.current, name, email, reason,
      messages: captured.current.filter((m) => m.role !== "system" && m.id !== "welcome").slice(-10)
        .filter((m) => !containsSensitiveData(m.text)).map((m) => ({ role: m.role, text: m.text.slice(0, 2000) })) };
    const parsed = ticketInputSchema.safeParse(data);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check your request."); return; }
    pendingInput.current = parsed.data;
    lock.current = true; setSaving(true); setError("");
    try {
      const result = await save({ data: parsed.data });
      if (!active.current) return;
      if (!result.ok) { setError(result.error); return; }
      setSaved(result.ticket);
      const question = [...captured.current].reverse().find((m) => m.role === "customer");
      setMessages((current) => [...current, { id: result.ticket.id, role: "system", text: `Support request saved: ${result.ticket.reference}. Status: Open. No human has been notified.`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        ...(question && current.some((m) => m.id === question.id) ? { inReplyTo: question.id } : {}) }]);
      void queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    } catch { if (active.current) setError(TICKET_SAVE_ERROR); }
    finally { lock.current = false; if (active.current) setSaving(false); }
  };

  return <Dialog open={open} onOpenChange={(value) => {
    if (saving) return;
    if (value && !open) {
      captured.current = messages;
      conversationId.current = getConversationId();
      if (saved || !requestId.current) { requestId.current = crypto.randomUUID(); pendingInput.current = null; setSaved(null); setName(""); setEmail(""); setReason(""); setError(""); }
    }
    setOpen(value);
  }}>
    <DialogTrigger asChild><Button variant="outline" className="rounded-full"><UserRound />Talk to Human</Button></DialogTrigger>
    <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg">
      <DialogHeader><DialogTitle>{saved ? "Support request saved" : "Contact support"}</DialogTitle>
        <DialogDescription>{saved ? "Your request is stored securely. No human has been notified or assigned." : "Save a private support request. Do not include passwords, OTPs, CVVs or full payment-card details."}</DialogDescription>
      </DialogHeader>
      {saved ? <div className="space-y-4"><CheckCircle className="h-8 w-8 text-primary" /><p className="break-all font-semibold">{saved.reference}</p><p className="text-sm">Status: {saved.status}</p><Button onClick={() => setOpen(false)}>Done</Button></div> : <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <div className="space-y-2"><Label htmlFor="support-name">Name (optional)</Label><Input id="support-name" maxLength={100} value={name} disabled={saving || Boolean(pendingInput.current)} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
        <div className="space-y-2"><Label htmlFor="support-email">Email (optional)</Label><Input id="support-email" type="email" maxLength={255} value={email} disabled={saving || Boolean(pendingInput.current)} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
        <div className="space-y-2"><Label htmlFor="support-reason">Reason for contacting support</Label><Textarea id="support-reason" required maxLength={2000} value={reason} disabled={saving || Boolean(pendingInput.current)} onChange={(e) => setReason(e.target.value)} /></div>
        <p className="break-all text-xs text-muted-foreground">Conversation: {conversationId.current}</p>
        <p className="text-xs text-muted-foreground">The latest safe conversation messages will be saved with this request. Messages containing sensitive details are omitted.</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {!ready ? <p className="text-sm text-muted-foreground">Checking sign-in…</p> : !userId ? <SupportSignIn /> : <Button type="submit" disabled={saving || !reason.trim()}><Send />{saving ? "Saving…" : error && pendingInput.current ? "Retry save" : "Save support request"}</Button>}
      </form>}
    </DialogContent>
  </Dialog>;
}