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
