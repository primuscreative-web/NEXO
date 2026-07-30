# Environment matrix

| Variable                      | Local                       | Preview                      | Production             | Secret | Consumer              | Rotation                                  |
| ----------------------------- | --------------------------- | ---------------------------- | ---------------------- | ------ | --------------------- | ----------------------------------------- |
| `NODE_ENV`                    | `development`               | `production`                 | planned only           | no     | all services          | n/a                                       |
| `APP_ENV`                     | unset                       | `preview`                    | planned only           | no     | operational scripts   | n/a                                       |
| `DATABASE_URL`                | local/disposable PostgreSQL | isolated PostgreSQL with SSL | separate resource only | yes    | API, worker, Prisma   | provider credential rotation              |
| `REDIS_URL`                   | local/disposable Redis      | isolated TLS Redis           | separate resource only | yes    | health, worker, relay | provider token rotation                   |
| `AUTH_JWT_PRIVATE_KEY`        | ephemeral allowed           | Ed25519 PEM                  | separate key pair only | yes    | API signing           | overlap public keys, then revoke sessions |
| `AUTH_JWT_PUBLIC_KEY`         | ephemeral allowed           | Ed25519 PEM                  | separate key pair only | no     | API verification      | with private key rotation                 |
| `AUTH_JWT_ISSUER`             | `nexo`                      | `nexo-preview`               | planned only           | no     | API auth              | n/a                                       |
| `AUTH_JWT_AUDIENCE`           | `nexo-api`                  | `nexo-preview-api`           | planned only           | no     | API auth              | n/a                                       |
| `WEB_ORIGIN`                  | localhost                   | temporary HTTPS web URL      | planned only           | no     | API CORS              | URL change                                |
| `NEXT_PUBLIC_API_URL`         | localhost                   | temporary HTTPS API URL      | planned only           | no     | web and smoke script  | URL change                                |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | optional                    | optional                     | decision pending       | mixed  | observability         | provider policy                           |
| `STORAGE_*`                   | placeholder                 | disabled                     | decision pending       | mixed  | future adapter        | provider policy                           |

Preview must use synthetic data, `APP_ENV=preview`, separate secrets, and no external provider credentials. Production is planning-only in this phase.
