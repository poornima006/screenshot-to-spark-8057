# ShopEase security review

## Applied changes
- Revoked overly broad anonymous and authenticated table privileges. Customers can read authorized rows and insert only request fields; only status is updateable, and RLS permits updates only to explicitly assigned staff.
- Added sensitive-input protection before browser chat requests and again before server AI calls; previous sensitive messages are omitted and email addresses are removed upstream.
- Removed detailed AI-provider errors from application logs.
- Added private session reset on confirmed logout or authenticated account changes, guarded late ticket results after form unmount, and deferred authentication callback work outside the session lock.

## Verified
- All 77 tests passed: existing policies, retrieval, evaluation, ticket validation, routing and seven new security tests.
- Actual database requests with a signed-in customer returned no other-owner tickets when filtering by either ticket ID or reference.
- Anonymous reads, forged-owner creation, staff self-assignment and edits to ticket content were denied.
- Live grants now exclude anonymous access, grant authenticated SELECT, limit INSERT to request fields and limit UPDATE to status. Existing RLS continues to restrict reads to owner/staff and updates to staff.
- Existing secure server functions retain authentication middleware and use user-scoped database clients, not privileged clients.
- No private API key literal or privileged client import was found in frontend feature code. Only generated publishable configuration is browser-visible.
- Basic platform checks reported no issues after the permission changes.

## Follow-up fixes (Nov 2)
- Logout: root cause was the private-session reset returning the dashboard to its Evaluation tab, hiding the signed-out view; the session was being cleared. The dashboard tab now persists in the URL. Verified live: sign-out removes the stored session, tickets disappear, reload stays signed out, signing in again shows tickets.
- Ticket server functions now re-check the session with the authentication service on every call.
- AI chat limit: server-side, 20 messages per 10 minutes per anonymous network address (hashed), 40 per signed-in account (verified token), then a 5-minute cooldown; identical message within 10 seconds is rejected. Counters live in a table only the server can reach. If the limiter is down, chat stays available.
- 83 tests pass.

## Session revocation verification status (Nov 6)

Verified live:
- Cancelled-session recording works. Signing out stored the session in the private revocation list before the sign-out completed; the stored entry matched the real Google sign-out time and was the only entry in the list.
- The database authorization check rejects cancelled sessions. The same check that guards ticket and staff access returned "not allowed" for the recorded cancelled session.
- No authentication credentials were displayed, logged or exposed during verification.

Not verified:
- The full replay test against the support ticket functions could not be completed: the preview authentication session was not accessible to the verification tool, so no copy of a real pre-logout credential was available to resend.
- Rejection of an old credential through the ticket functions therefore remains unverified. The database-level rejection above is verified; the ticket-function path is covered only by automated rule tests and code review.
- Full session revocation is not marked as completely verified.

Remaining risk:
- A previously stolen credential may remain usable until it expires if it cannot be associated with a cancellable session (for example a token that carries no session ID). Such tokens are allowed by design so legitimate customers are never locked out.

## Remaining limitations
- Session revocation (Nov 4): the authentication service ends the session at logout but does not reject an already-issued access token until it expires. The app now records the session ID at logout in a private revocation list; database policies on tickets and staff membership, and the ticket server functions, reject tokens from revoked sessions. Users can only revoke their own current session (forged revocation 403, anonymous 401, list unreadable).
- Not live-verified: test sign-ins available to the agent carry no session ID, so replaying one after logout still worked (expected). Tokens without a session ID are not blocked, so legitimate customers are never locked out. Real Google/Lovable sign-ins normally include a session ID, but the revoked-replay path was confirmed only by automated rule tests and code review.
- Customers sharing one network address (offices, mobile carriers) share the anonymous limit; attackers rotating addresses can bypass it. Limiter outage fails open.
- The 20-message cutoff and cooldown were tested with automated rule tests, not by sending 21 live AI messages.
- Newly added cleanup and privacy changes were not included in the earlier deep scan snapshot; basic checks were rerun after changes.
- Credential detection is heuristic and cannot identify every unlabeled or obfuscated secret. It is not a guarantee against all personal information being submitted.
- Social-provider sign-in, session expiration/revocation behavior, and production bundle contents were not independently verified in this review.
- Staff authorization paths were reviewed against RLS and server checks; no real customer was granted staff permissions in this review.

No design changes, feature removals, automatic staff grants, or retained synthetic verification tickets were made.