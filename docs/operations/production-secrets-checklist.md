# Production secrets checklist

1. **PostgreSQL and Redis** — create isolated preview resources and least-privilege runtime accounts. Store `DATABASE_URL` and `REDIS_URL` only in the platform secret store. Validate health endpoints and migrations before production.
2. **Authentication** — generate a dedicated Ed25519 pair per environment. Store the private key as a secret and rotate by deploying a compatible key set with a documented session invalidation plan.
3. **Web/API origin** — set `WEB_ORIGIN` and `NEXT_PUBLIC_API_URL` to the approved preview domain; public variables must never contain credentials.
4. **Storage (future attachments)** — create a private bucket and scoped access key only after the storage adapter is implemented.
5. **Channel and AI providers (future)** — WhatsApp and AI keys are not yet runtime dependencies. Obtain them only after product approval, with webhook validation and least-privilege scopes.

Never commit `.env` files or paste secret values into issues, chat, test logs, or documentation.
