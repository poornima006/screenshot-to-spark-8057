CREATE TABLE public.chat_rate_limits (
  bucket text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0,
  blocked_until timestamptz,
  last_hash text,
  last_at timestamptz
);
GRANT ALL ON public.chat_rate_limits TO service_role;
ALTER TABLE public.chat_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_chat_quota(_bucket text, _hash text, _limit integer, _window_seconds integer, _cooldown_seconds integer, _duplicate_seconds integer)
RETURNS TABLE(outcome text, retry_after integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.chat_rate_limits%ROWTYPE; t timestamptz := now();
BEGIN
  INSERT INTO public.chat_rate_limits(bucket, window_start, request_count) VALUES (_bucket, t, 0) ON CONFLICT (bucket) DO NOTHING;
  SELECT * INTO r FROM public.chat_rate_limits WHERE bucket = _bucket FOR UPDATE;
  IF r.blocked_until IS NOT NULL AND r.blocked_until > t THEN
    RETURN QUERY SELECT 'limited'::text, ceil(extract(epoch FROM r.blocked_until - t))::integer; RETURN;
  END IF;
  IF r.last_hash = _hash AND r.last_at > t - make_interval(secs => _duplicate_seconds) THEN
    RETURN QUERY SELECT 'duplicate'::text, _duplicate_seconds; RETURN;
  END IF;
  IF r.window_start <= t - make_interval(secs => _window_seconds) THEN
    r.window_start := t; r.request_count := 0;
  END IF;
  IF r.request_count >= _limit THEN
    UPDATE public.chat_rate_limits SET blocked_until = t + make_interval(secs => _cooldown_seconds), window_start = t, request_count = 0 WHERE bucket = _bucket;
    RETURN QUERY SELECT 'limited'::text, _cooldown_seconds; RETURN;
  END IF;
  UPDATE public.chat_rate_limits SET window_start = r.window_start, request_count = r.request_count + 1, blocked_until = NULL, last_hash = _hash, last_at = t WHERE bucket = _bucket;
  RETURN QUERY SELECT 'allowed'::text, 0;
END $$;
REVOKE ALL ON FUNCTION public.consume_chat_quota(text, text, integer, integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_chat_quota(text, text, integer, integer, integer, integer) TO service_role;