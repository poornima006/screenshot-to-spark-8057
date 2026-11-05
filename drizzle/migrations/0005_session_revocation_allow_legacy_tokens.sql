CREATE OR REPLACE FUNCTION public.current_session_active() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.revoked_sessions
    WHERE session_id = nullif(auth.jwt() ->> 'session_id', '')::uuid
  );
$$;