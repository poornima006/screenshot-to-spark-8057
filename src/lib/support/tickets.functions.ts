import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { saveTicket, ticketInputSchema, statusInputSchema, canChangeTicketStatus, type SupportTicket } from "./tickets";

const columns = "id, reference, reason, status, created_at";

export const createSupportTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => ticketInputSchema.parse(data))
  .handler(async ({ data, context }) => saveTicket(data, context.userId, {
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
  }));

export const listSupportTickets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { page: number }) => {
    if (!Number.isInteger(data.page) || data.page < 0 || data.page > 10000) throw new Error("Invalid page");
    return data;
  })
  .handler(async ({ data, context }) => {
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
    const staff = await context.supabase.rpc("is_support_staff");
    if (staff.error || !canChangeTicketStatus(Boolean(staff.data))) return { ok: false as const, error: "Only authorized support staff can change ticket status." };
    const result = await context.supabase.from("support_tickets").update({ status: data.status }).eq("id", data.id).select("id").maybeSingle();
    if (result.error || !result.data) return { ok: false as const, error: "Status wasn’t updated. Please retry." };
    return { ok: true as const };
  });