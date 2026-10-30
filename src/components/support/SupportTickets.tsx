import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, RefreshCw, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listSupportTickets, updateSupportTicket } from "@/lib/support/tickets.functions";
import { TICKET_STATUSES, statusInputSchema } from "@/lib/support/tickets";
import { SupportSignIn, SupportSignOut, useSupportAccount } from "./SupportAccount";

export function SupportTickets() {
  const { userId, ready } = useSupportAccount();
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const fetchTickets = useServerFn(listSupportTickets);
  const update = useServerFn(updateSupportTicket);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["support-tickets", userId, page], queryFn: () => fetchTickets({ data: { page } }), enabled: Boolean(userId), retry: false });
  if (!ready) return <p className="py-6 text-sm text-muted-foreground">Checking sign-in…</p>;
  if (!userId) return <section className="space-y-4 py-6"><h2 className="text-lg font-bold">Support Tickets</h2><SupportSignIn /></section>;
  const result = query.data;
  return <section className="space-y-4 py-6" aria-label="Support Tickets">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-lg font-bold"><Ticket className="h-5 w-5 text-primary" />Support Tickets</h2><div className="flex gap-2"><Button variant="ghost" size="icon" aria-label="Refresh tickets" title="Refresh tickets" onClick={() => query.refetch()}><RefreshCw /></Button><SupportSignOut /></div></div>
    <p className="text-sm text-muted-foreground">{result?.ok && result.isStaff ? "Authorized support view" : "Your private support requests"} · Stored in Lovable Cloud, separate from session-based chat evaluation.</p>
    {query.isPending ? <p className="text-sm text-muted-foreground">Loading tickets…</p> : query.isError || !result?.ok ? <div role="alert"><p className="text-sm text-destructive">{result && !result.ok ? result.error : "Couldn’t load tickets. Please retry."}</p><Button variant="outline" onClick={() => query.refetch()}>Retry</Button></div> : result.tickets.length === 0 ? <div className="py-8 text-center"><Ticket className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p>No support requests yet.</p></div> : <div className="overflow-x-auto rounded-lg border border-border"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-muted text-muted-foreground"><tr>{["Ticket reference", "Reason", "Status", "Created"].map((label) => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-border bg-card">{result.tickets.map((ticket) => <tr key={ticket.id}><td className="max-w-[220px] break-all px-4 py-4 align-top">{ticket.reference}</td><td className="max-w-xs break-words px-4 py-4 align-top">{ticket.reason}</td><td className="px-4 py-4 align-top">{result.isStaff ? <Select value={ticket.status} disabled={updating} onValueChange={async (status) => {
      const parsed = statusInputSchema.safeParse({ id: ticket.id, status }); if (!parsed.success) return;
      setUpdating(true); setError("");
      try { const response = await update({ data: parsed.data }); if (!response.ok) setError(response.error); else await queryClient.invalidateQueries({ queryKey: ["support-tickets"] }); }
      catch { setError("Status wasn’t updated. Please retry."); } finally { setUpdating(false); }
    }}><SelectTrigger aria-label={`Status for ${ticket.reference}`} className="w-36"><SelectValue /></SelectTrigger><SelectContent>{TICKET_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select> : ticket.status}</td><td className="whitespace-nowrap px-4 py-4 align-top">{new Date(ticket.created_at).toLocaleDateString()}<span className="block text-xs text-muted-foreground">{new Date(ticket.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></td></tr>)}</tbody></table></div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {result?.ok && <div className="flex items-center gap-3"><Button variant="outline" size="icon" aria-label="Previous tickets" title="Previous tickets" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft /></Button><span className="text-sm text-muted-foreground">Page {page + 1}</span><Button variant="outline" size="icon" aria-label="Next tickets" title="Next tickets" disabled={!result.hasMore} onClick={() => setPage((p) => p + 1)}><ChevronRight /></Button></div>}
  </section>;
}