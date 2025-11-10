# Personal Website (Next.js on Cloudflare Workers)

A streaming chat app built with Next.js, OpenRouter, and Cloudflare Workers. The UI uses the ElevenLabs Conversation component, with Turnstile verification and Llama Guard moderation.

## Prerequisites

- Node.js 18+
- pnpm
- Wrangler CLI

## Environment Variables

Set these in your local shell, `.env.local`, or in Cloudflare Workers secrets:

- `OPENROUTER_API_KEY`
- `GROQ_API_KEY`
- `TURNSTILE_SECRET_KEY`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`

## Development

Run the Next.js dev server:

```bash
pnpm run dev
```

Preview in the Workers runtime:

```bash
pnpm run preview
```

## Deployment

```bash
pnpm run deploy
```

## Notes

- Turnstile is required to send messages.
- The API route streams responses using Server-Sent Events (SSE).
- Moderation runs against Llama Guard 4 via Groq.
