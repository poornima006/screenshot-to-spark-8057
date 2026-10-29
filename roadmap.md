# ShopEase evaluation dashboard

- [x] Retrieve ranked keyword matches from the separate policy and FAQ records before AI calls.
- [x] Constrain answers to retrieved facts and return verified sources; keep unavailable and order safety rules.
- [x] Display source attribution without changing the existing layout or features.
- [x] Test retrieval, attribution, unknown questions and safety, then verify the live chat.
- [x] Share current conversation state across chat and dashboard without persistent storage.
- [x] Display actual evaluation metrics, source usage and recent activity with honest empty states.
- [x] Test calculations and verify dashboard navigation and live chat end to end (51 tests passed; live shipping, escalation, clearing and mobile display checked).

## Human-support tickets
- [ ] Add private persistent tickets, validation, redaction, and retry-safe creation.
- [ ] Connect the support form and private dashboard ticket view with authorized status updates.
- [ ] Test creation, failures, privacy and status rules; verify saving and reading a real request through the UI.