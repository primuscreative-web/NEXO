# Environment Matrix

| Environment | Data                         | Secrets                     | Deployment                        | Purpose                    |
| ----------- | ---------------------------- | --------------------------- | --------------------------------- | -------------------------- |
| Local       | none or isolated development | `.env`, never committed     | local processes + managed sandbox | development                |
| Development | non-production               | managed secret store        | automated                         | integration                |
| Staging     | production-like, sanitized   | managed secret store        | controlled CD                     | acceptance and performance |
| Production  | customer data                | managed vault/KMS           | approved rollout                  | live service               |
| Sandbox     | isolated provider test data  | scoped provider credentials | automated/ephemeral               | external integration tests |

No environment may reuse production credentials outside production. Preview environments use isolated data and least-privilege credentials.

Preferred development providers are Supabase or Neon for PostgreSQL and Upstash for Redis. Object storage may use Supabase Storage or an S3-compatible service when its product phase begins. Provider-specific SDKs remain behind ports; CI integration uses ephemeral services and never developer or production data.
