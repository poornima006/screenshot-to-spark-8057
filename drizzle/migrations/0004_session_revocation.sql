CREATE TABLE public.revoked_sessions (
  session_id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  revoked_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.revoked_sessions TO authenticated;
GRANT ALL ON public.revoked_sessions TO service_role;
ALTER TABLE public.revoked_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users revoke their own current session" ON public.revoked_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND session_id = nullif(auth.jwt() ->> 'session_id', '')::uuid);

CREATE FUNCTION public.current_session_active() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT nullif(auth.jwt() ->> 'session_id', '') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.revoked_sessions WHERE session_id = nullif(auth.jwt() ->> 'session_id', '')::uuid);
$$;
REVOKE ALL ON FUNCTION public.current_session_active() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_session_active() TO authenticated, service_role;

CREATE POLICY "Revoked sessions cannot use tickets" ON public.support_tickets AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.current_session_active()) WITH CHECK (public.current_session_active());
CREATE POLICY "Revoked sessions cannot read staff membership" ON public.support_staff AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.current_session_active());