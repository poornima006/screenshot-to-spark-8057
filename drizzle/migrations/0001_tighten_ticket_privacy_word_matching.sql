CREATE OR REPLACE FUNCTION public.protect_ticket_secrets() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE forbidden text := '\m(password|passcode|passwd|pwd|otp|one.time|verification.code|security.code|cvv|cvc|pin|card.number|card.details)\M|[0-9][0-9[:space:]-]{10,}[0-9]|\m[0-9]{3,8}\M';
BEGIN
 IF (coalesce(NEW.name, '') || ' ' || coalesce(NEW.email, '') || ' ' || NEW.reason) ~* forbidden THEN
   RAISE EXCEPTION 'Remove sensitive credentials or payment details from support fields';
 END IF;
 IF NEW.context ~* forbidden THEN NEW.context := '[Sensitive conversation context omitted]'; END IF;
 RETURN NEW;
END; $$;