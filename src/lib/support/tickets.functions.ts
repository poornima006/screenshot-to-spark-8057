import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequest } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { isSessionAllowed } from "./privacy";

/** Rejects tokens whose session was ended by logout, even before the token expires. */
async function requireLiveSession(supabase: SupabaseClient<Database>, token: string) {
  const [{ data, error }, active] = await Promise.all([supabase.auth.getUser(token), supabase.rpc("current_session_active")]);
  if (!isSessionAllowed({ userValid: !error && Boolean(data.user), notRevoked: active.error ? null : active.data })) throw new Error("Unauthorized: Session ended");
}
import { saveTicket, ticketInputSchema, statusInputSchema, canChangeTicketStatus, type SupportTicket } from "./tickets";

const columns = "id, reference, reason, status, created_at";

export const createSupportTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => ticketInputSchema.parse(data))
  .handler(async ({ data, context }) => { await requireLiveSession(context.supabase, getRequest().headers.get("authorization")?.slice(7) ?? ""); return saveTicket(data, context.userId, {
    find: async (userId, requestId) => {
      const result = await context.supabase.from("support_tickets").select(columns).eq("user_id", userId).eq("request_id", requestId).maybeSingle();
      if (result.error) throw new Error("Ticket lookup failed");
      return result.data as SupportTicket | null;
    },
    insert: async (row) => {
      const result = await context.supabase.from("support_tickets").insert(row).select(columns).single();
      if (result.error || !result.data) throw new Error("Ticket save failed");
      return result.data as SupportTicket;
    },
  }); });

export const listSupportTickets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ page: z.number().int().min(0).max(10000) }).strict().parse(data))
  .handler(async ({ data, context }) => {
    await requireLiveSession(context.supabase, getRequest().headers.get("authorization")?.slice(7) ?? "");
    const { data: staff, error: staffError } = await context.supabase.rpc("is_support_staff");
    if (staffError) return { ok: false as const, error: "Couldn’t load support tickets. Please retry." };
    const result = await context.supabase.from("support_tickets").select(columns).order("created_at", { ascending: false }).order("id").range(data.page * 25, data.page * 25 + 25);
    if (result.error) return { ok: false as const, error: "Couldn’t load support tickets. Please retry." };
    return { ok: true as const, tickets: result.data.slice(0, 25) as SupportTicket[], hasMore: result.data.length > 25, isStaff: Boolean(staff) };
  });

export const updateSupportTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => statusInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireLiveSession(context.supabase, getRequest().headers.get("authorization")?.slice(7) ?? "");
    const staff = await context.supabase.rpc("is_support_staff");
    if (staff.error || !canChangeTicketStatus(Boolean(staff.data))) return { ok: false as const, error: "Only authorized support staff can change ticket status." };
    const result = await context.supabase.from("support_tickets").update({ status: data.status }).eq("id", data.id).select("id").maybeSingle();
    if (result.error || !result.data) return { ok: false as const, error: "Status wasn’t updated. Please retry." };
    return { ok: true as const };
  });