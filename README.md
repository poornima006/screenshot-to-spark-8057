# ShopEase AI Customer Support Agent

A portfolio project: an AI support chat for a fictional store, ShopEase.

## Features
- **AI chat with keyword-based retrieval (RAG):** each question is matched against separate policy records (shipping, returns, refunds, payments, cancellation, FAQs) before the AI call. Only retrieved, verified sources are shown as citations. No embeddings or semantic search are used.
- **Honest fallbacks:** unknown or order-specific questions get an "information unavailable" answer and a Talk to Human option. No order statuses are invented.
- **Talk to Human tickets:** signed-in customers can save private support requests (Open / In Progress / Resolved). Only explicitly assigned staff can manage them.
- **Evaluation dashboard:** session-based metrics computed from the current conversation only.
- **Security:** server-side AI chat rate limits, sensitive-data filtering, owner/staff database policies, and session cancellation on logout. See [SECURITY_REVIEW.md](SECURITY_REVIEW.md) for verified results and known limitations, including the unverified live replay test.

## Tests
`bunx vitest run`

## Note on `.env`
The tracked `.env` contains only publishable client settings. Private keys are stored as backend secrets and are never committed.

---

## About Lovable

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
