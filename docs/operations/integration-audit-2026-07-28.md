# Integration audit — 2026-07-28

This report records evidence gathered before creating or connecting provider credentials. Visual state from Stitch is not operational evidence.

## Product surfaces

- The deployed `/integrations` route was an honest Phase 4 placeholder before this audit.
- Stitch marketplace variants are static visual references. Their union contains WhatsApp Business, Slack, Salesforce, HubSpot, Shopify, Stripe, Google Drive, GitHub and a custom API entry.
- One Stitch variant labels WhatsApp as `Conectado` and HubSpot as `Ativo`. Neither label was backed by runtime code or provider diagnostics.
- Instagram Messaging is an approved architecture target even though it is not a marketplace card in the inspected Stitch variants.
- OpenAI belongs to the approved Phase 5 AI provider layer and must not be treated as an active Phase 4 integration.

## Evidence matrix

| Integration            | Card/reference             | Backend                                | Credential in runtime | Webhook                     | Real test                            | Audited status                                     |
| ---------------------- | -------------------------- | -------------------------------------- | --------------------- | --------------------------- | ------------------------------------ | -------------------------------------------------- |
| WhatsApp Cloud API     | Yes, Stitch                | Signed webhook gateway implemented     | Partial in Render     | Awaiting public gateway URL | No real message yet                  | Configuration incomplete                           |
| Instagram Messaging    | Architecture/Meta app      | No adapter                             | App credentials only  | Empty in Meta               | No                                   | Disabled by product decision on 2026-07-29         |
| Slack                  | Yes, Stitch                | No                                     | No                    | No                          | No                                   | Disabled; prototype only                           |
| Salesforce             | Yes, Stitch                | No                                     | No                    | No                          | No                                   | Disabled; prototype only                           |
| HubSpot                | Yes, Stitch                | No                                     | No                    | No                          | No                                   | Disabled; prototype label was false                |
| Shopify                | Yes, Stitch                | No                                     | No                    | No                          | No                                   | Disabled; prototype only                           |
| Stripe                 | Yes, Stitch                | No approved payment flow               | No                    | No                          | No                                   | Disabled; out of current scope                     |
| Google Drive           | Yes, Stitch                | No                                     | No OAuth client       | No                          | No                                   | Disabled; prototype only                           |
| GitHub                 | Yes, Stitch                | CI/deploy only, not tenant integration | No tenant credential  | N/A                         | CI is real                           | Disabled as marketplace integration                |
| Custom API             | Yes, Stitch                | No public integration lifecycle        | No                    | No                          | No                                   | Disabled; prototype only                           |
| OpenAI                 | Architecture Phase 5       | No runtime adapter                     | No runtime variable   | N/A                         | No                                   | Disabled                                           |
| PostgreSQL / Neon      | Infrastructure             | Prisma adapter                         | Yes, secret managers  | N/A                         | TLS, migrations and readiness passed | Functional in Preview                              |
| Redis / Upstash        | Infrastructure             | Cache/Outbox                           | Yes, secret managers  | N/A                         | TLS, queue and readiness passed      | Functional in Preview; dashboard login not audited |
| S3-compatible storage  | Infrastructure placeholder | In-memory test adapter only            | No                    | N/A                         | Unit mock only                       | Not configured                                     |
| OpenTelemetry exporter | Optional infrastructure    | Trace context only                     | No endpoint found     | N/A                         | No exporter smoke                    | Not configured                                     |

## Existing external resources

- Meta app `NEXO` exists and includes WhatsApp and Instagram use cases, but is unpublished.
- WhatsApp has a server-side verify token ready. The callback awaits deployment of the dedicated gateway; phone registration, payment setup and a real send test remain pending.
- Instagram was explicitly deferred on 2026-07-29. No account, access token or webhook is connected, and the UI must not represent it as active.
- Google Cloud project `NEXO` exists. Gmail and Calendar APIs are not enabled; there is no API key, OAuth client or service account.
- OpenAI project `NEXO` exists with one active project key that has never been used. The runtime has no OpenAI variable and the organization requests credits before an API call.
- Neon contains distinct `nexo-preview` and `nexo` projects.
- Vercel contains distinct `nexo` and `nexo-api` projects. The web project has `NEXO_BACKEND_URL` and `NEXT_PUBLIC_API_URL`; the API project has no project environment variables.
- Render hosts the combined Preview runtime from the feature branch. Meta app credentials, the WhatsApp sandbox phone-number identifier and a generated webhook verify token are stored server-side; access token and WABA identifier are still absent.
- GitHub's `Preview` environment contains the Preview database, Redis, JWT and protected mailbox secrets. No external provider secret exists.

## Architectural consequence

Only official Meta adapters are approved for the first external channels. Prototype-only providers remain visible as disabled catalog entries until a product use case and implementation checkpoint approve them. Presence of an environment variable alone is insufficient for `connected`; a live provider diagnostic and, where applicable, a healthy webhook are required.
