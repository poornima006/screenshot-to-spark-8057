REVOKE ALL ON public.support_staff FROM anon, authenticated;
GRANT SELECT ON public.support_staff TO authenticated;
GRANT ALL ON public.support_staff TO service_role;
REVOKE ALL ON public.support_tickets FROM anon, authenticated;
GRANT SELECT ON public.support_tickets TO authenticated;
GRANT INSERT (user_id, request_id, conversation_id, name, email, reason, context) ON public.support_tickets TO authenticated;
GRANT UPDATE (status) ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
REVOKE ALL ON FUNCTION public.protect_ticket_secrets() FROM PUBLIC, anon, authenticated;