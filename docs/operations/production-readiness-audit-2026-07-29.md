# Production readiness audit — 2026-07-29

## Audited user story

The public flow is `register` → Preview Runtime API → PostgreSQL identity and
organization data → secure cookie session → workspace selection → Dashboard.
The public Web runs on Vercel and reaches the combined runtime on Render through
the same-origin `/api` rewrite.

## Confirmed working

- `agentenexo.com.br` redirects permanently to `www.agentenexo.com.br` over
  HTTPS.
- The Web health endpoint and the proxied API liveness/readiness endpoints
  return HTTP 200.
- Readiness confirms PostgreSQL, Redis, worker and relay connectivity.
- A controlled browser smoke completed registration, login, first-workspace
  creation, Dashboard loading, session restoration after reload, logout and a
  second login.
- The Vercel production deployment uses `NEXT_PUBLIC_API_URL=/api` and an
  absolute server-only `NEXO_BACKEND_URL`.
- Render accepts the production domain in `WEB_ORIGIN` without weakening the
  origin or CSRF checks.

## Root cause corrected

The custom domain was attached to an eight-day-old production deployment that
had no production Web/API routing variables. Requests to `/api/*` therefore
returned the frontend 404 and the generated security policy referenced
localhost. A current feature-branch build was deployed to production, the
required variables were added, and the Render origin allowlist was updated.

## Remaining production gaps

1. The Render service still identifies itself as the Preview Runtime and runs
   on the free plan. Cold starts can make the first authentication request slow.
2. Email verification is disabled by Preview behavior. Production signup needs
   a real transactional-email adapter, verified sender/domain and
   `AUTH_EMAIL_VERIFICATION_REQUIRED=true`.
3. Password recovery has only the protected Preview mailbox path; a real
   delivery provider and recovery smoke are still required.
4. The production deployment was made directly from
   `codex/mvp-inbox-whatsapp-crm-ai`. The Vercel Git production branch remains
   `main`; a future deployment of the older main branch can replace the working
   release until the branch is merged or the production-branch policy changes.
5. WhatsApp has a verified callback, but phone registration, permanent access
   token, WABA identifier and real inbound/outbound message tests remain.
6. Object storage, OpenTelemetry export and the provider integrations marked
   disabled in the integration catalog are not production capabilities.
7. Backup restore/DR rehearsal, load testing, alerting and formal SLO evidence
   are not yet complete.

## Test data

The audit created one synthetic account and one synthetic workspace using an
`example.com` address. They contain no personal or provider data. Cleanup
requires a deliberate production-data operation and was not performed as part
of this audit.
