# ShopEase evaluation dashboard

- [x] Retrieve ranked keyword matches from the separate policy and FAQ records before AI calls.
- [x] Constrain answers to retrieved facts and return verified sources; keep unavailable and order safety rules.
- [x] Display source attribution without changing the existing layout or features.
- [x] Test retrieval, attribution, unknown questions and safety, then verify the live chat.
- [x] Share current conversation state across chat and dashboard without persistent storage.
- [x] Display actual evaluation metrics, source usage and recent activity with honest empty states.
- [x] Test calculations and verify dashboard navigation and live chat end to end (51 tests passed; live shipping, escalation, clearing and mobile display checked).

## Human-support tickets
- [x] Add private persistent tickets, validation, redaction, and retry-safe creation.
- [x] Connect the support form and private dashboard ticket view with authorized status updates.
- [x] Test creation, failures, privacy and status rules; verify saving and reading a real request through the UI (70 tests passed; failed-save retry, refresh persistence, anonymous denial, owner restrictions, staff workflow and mobile form checked; temporary data removed).

## Security review
- [x] Audit backend policies, secrets, session handling and conversation privacy; tighten grants and chat privacy.
- [x] Add and run security tests (77 passed); live cross-owner ID/reference, anonymous, forged-owner and staff self-assignment denial verified.
- [x] Report verified results and unresolved limitations in SECURITY_REVIEW.md; deep scan completed with public AI cost-abuse warning.
- [x] Fix and verify logout end to end (dashboard tab reset was hiding the signed-out view).
- [x] Add server-side AI chat rate limiting with cooldown and duplicate rejection.