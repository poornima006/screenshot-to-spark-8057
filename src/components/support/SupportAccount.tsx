import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { shouldResetPrivateSession } from "@/lib/support/privacy";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut } from "lucide-react";

const AccountContext = createContext<{ userId: string | null; ready: boolean; sessionVersion: number }>({ userId: null, ready: false, sessionVersion: 0 });
export function SupportAccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState({ userId: null as string | null, ready: false });
  const [sessionVersion, setSessionVersion] = useState(0);
  const identity = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const router = useRouter();
  useEffect(() => {
    let active = true;
    let changed = false;
    void supabase.auth.getUser().then(({ data }) => { if (active && !changed) { identity.current = data.user?.id ?? null; setAccount({ userId: identity.current, ready: true }); } }).catch(() => { if (active && !changed) setAccount({ userId: null, ready: true }); });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) return;
      changed = true;
      const next = session?.user.id ?? null;
      if (shouldResetPrivateSession(identity.current, next)) {
        setSessionVersion((version) => version + 1);
        void queryClient.cancelQueries(); queryClient.clear();
      }
      identity.current = next;
      setAccount({ userId: next, ready: true });
      if (event === "SIGNED_OUT") { void queryClient.cancelQueries(); queryClient.clear(); }
      // Leave the auth client's session lock before any refetch calls getSession.
      setTimeout(() => {
        if (!active) return;
        if (event !== "SIGNED_OUT") void queryClient.invalidateQueries();
        void router.invalidate();
      }, 0);
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [queryClient, router]);
  return <AccountContext.Provider value={{ ...account, sessionVersion }}>{children}</AccountContext.Provider>;
}
export const useSupportAccount = () => useContext(AccountContext);

export function SupportSignIn() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const signIn = async (provider: "google" | "lovable") => {
    setBusy(true); setError("");
    try {
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
      if (result.error) setError("Sign-in didn’t complete. Please try again.");
    } catch { setError("Sign-in didn’t complete. Please try again."); }
    finally { setBusy(false); }
  };
  return <div className="space-y-3">
    <p className="text-sm text-muted-foreground">Sign in to keep your support requests private. Chat remains available without signing in.</p>
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" disabled={busy} onClick={() => signIn("google")}><LogIn />Continue with Google</Button>
      <Button type="button" variant="outline" disabled={busy} onClick={() => signIn("lovable")}><LogIn />Continue with Lovable</Button>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}

export function SupportSignOut() {
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <div><Button variant="ghost" size="sm" disabled={busy} onClick={async () => {
    setBusy(true); setError("");
    try {
      await queryClient.cancelQueries(); queryClient.clear();
      const result = await supabase.auth.signOut();
      if (result.error) setError("Couldn’t sign out. Please retry.");
    } catch { setError("Couldn’t sign out. Please retry."); }
    finally { setBusy(false); }
  }}><LogOut />Sign out</Button>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div>;
}