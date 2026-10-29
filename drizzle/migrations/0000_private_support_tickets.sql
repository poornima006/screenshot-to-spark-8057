CREATE TABLE public.support_staff (user_id uuid PRIMARY KEY);
GRANT SELECT ON public.support_staff TO authenticated;
GRANT ALL ON public.support_staff TO service_role;
ALTER TABLE public.support_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read own membership" ON public.support_staff FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE FUNCTION public.is_support_staff() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.support_staff WHERE user_id = auth.uid()); $$;
REVOKE ALL ON FUNCTION public.is_support_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_support_staff() TO authenticated, service_role;
CREATE TABLE public.support_tickets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 reference text NOT NULL UNIQUE DEFAULT ('SE-' || upper(gen_random_uuid()::text)),
 user_id uuid NOT NULL,
 request_id uuid NOT NULL,
 conversation_id uuid NOT NULL,
 name text CHECK (name IS NULL OR char_length(name) BETWEEN 1 AND 100),
 email text CHECK (email IS NULL OR (char_length(email) <= 255 AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
 reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 1 AND 2000),
 context text NOT NULL DEFAULT '' CHECK (char_length(context) <= 22000),
 status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (user_id, request_id)
);
GRANT SELECT ON public.support_tickets TO authenticated;
GRANT INSERT (user_id, request_id, conversation_id, name, email, reason, context) ON public.support_tickets TO authenticated;
GRANT UPDATE (status) ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners and staff read tickets" ON public.support_tickets FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_support_staff());
CREATE POLICY "Owners create open tickets" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'Open');
CREATE POLICY "Staff update ticket status" ON public.support_tickets FOR UPDATE TO authenticated USING (public.is_support_staff()) WITH CHECK (public.is_support_staff());
CREATE INDEX support_tickets_owner_date ON public.support_tickets (user_id, created_at DESC);
CREATE FUNCTION public.protect_ticket_secrets() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF coalesce(NEW.name, '') || ' ' || coalesce(NEW.email, '') || ' ' || NEW.reason ~* '(password|passcode|passwd|pwd|otp|one.time|verification.code|security.code|cvv|cvc|pin|card.number|card.details|[0-9][0-9[:space:]-]{10,}[0-9]|\m[0-9]{3,8}\M)' THEN
   RAISE EXCEPTION 'Remove sensitive credentials or payment details from support fields';
 END IF;
 IF NEW.context ~* '(password|passcode|passwd|pwd|otp|one.time|verification.code|security.code|cvv|cvc|pin|card.number|card.details|[0-9][0-9[:space:]-]{10,}[0-9]|\m[0-9]{3,8}\M)' THEN
   NEW.context := '[Sensitive conversation context omitted]';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER protect_support_ticket_secrets BEFORE INSERT ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.protect_ticket_secrets();