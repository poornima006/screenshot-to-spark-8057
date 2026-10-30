<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Rules

- Each policy lives in its own typed record under `src/lib/support/knowledge/`; `knowledge-base.ts` aggregates these records for existing consumers and the AI prompt, while FAQs reference their summaries so policy wording changes in exactly one place.
- The chat answers through `askSupport` in `src/lib/support/chat.functions.ts`, a public `createServerFn` that calls the AI Gateway (`generateResponse`, model `openai/gpt-6-astra`) server-side; the browser never sees the API key. `demo-responder.ts` is kept only for the handoff/unavailable copy and its tests.
- `answerWithRetrieval` ranks whole-word keyword/FAQ matches before generation and supplies only retrieved records; the AI selects relevant source IDs and `groundAnswer` renders their trusted text verbatim, so unsupported generated facts or citations cannot reach the UI. Unknown and individual-status questions bypass generation; no embeddings or semantic search are implemented.
- Chat and evaluation share in-memory state through a root-level SupportSessionProvider so route navigation preserves conversations and pending requests without persisting customer data.
- Support tickets use authenticated server functions and owner/staff RLS in Lovable Cloud; support_staff membership is assigned only by trusted operators, never from client metadata or automatic signup.
- Ticket submission is idempotent per authenticated owner and request UUID; redact sensitive context client/server-side, reject sensitive form fields, and retain database safeguards against direct API bypass.
- Only a confirmed saved ticket appends a linked escalation message; ticket data is separate from session-only evaluation and never implies human notification.
- Evaluation derives per-question metrics from explicit response links; retrieved candidates come from the RAG workflow, source usage counts verified used IDs, and failures with missing retrieval telemetry remain unknown rather than guessed.
