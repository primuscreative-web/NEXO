# Phase 0 Threat Notes

| Threat                        | Foundation control                                              |
| ----------------------------- | --------------------------------------------------------------- |
| secret committed              | ignore rules, example-only env, Gitleaks CI                     |
| supply-chain script execution | pnpm `allowBuilds` allowlist, lockfile, Dependabot, audit       |
| vulnerable container          | pinned base/service versions and rebuild automation             |
| sensitive log leakage         | structured logger redaction                                     |
| exposed dependency details    | liveness responses contain no topology or secrets               |
| development database reused   | local-only credentials visibly named and environment separation |
| root container compromise     | non-root runtime user                                           |

Identity, tenancy, channels, AI, voice, workflows, and billing require dedicated threat models in their phases.
