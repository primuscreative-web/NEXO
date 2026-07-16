# Phase 1 Data Classification and Retention

| Data                              | Classification                  | Storage                                                   | Initial retention                          | Logging rule                          |
| --------------------------------- | ------------------------------- | --------------------------------------------------------- | ------------------------------------------ | ------------------------------------- |
| e-mail/name/profile               | personal                        | User                                                      | account lifecycle + legal policy           | mask e-mail; no full profile          |
| password hash                     | restricted credential           | UserCredential                                            | until replacement/account deletion policy  | never log                             |
| access/refresh/reset/invite token | secret                          | token value only in transit; hash at rest where persisted | shortest functional expiry                 | never log full or hash                |
| session IP/user agent             | security personal data          | Session/Audit                                             | 180 days initially, review with LGPD owner | minimize and authorize                |
| organization/legal name           | business confidential           | Organization                                              | organization lifecycle                     | identifier/name only when permitted   |
| membership/team/role              | confidential authorization data | Organization                                              | lifecycle + audit retention                | IDs and action, no unrelated PII      |
| audit record                      | security/compliance             | append-only AuditLog                                      | 365 days initially; legal review required  | record is the log; metadata allowlist |
| outbox payload                    | internal                        | OutboxEvent                                               | until publish + 30-day replay window       | schema-minimal, no secrets            |

Initial periods are engineering defaults, not final legal policy. Legal basis, data-subject export/deletion exceptions and contractual retention must be approved before production. Password/token secrets are never exported as personal-data payloads.
