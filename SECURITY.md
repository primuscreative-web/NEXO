# Security Policy

## Reporting

Do not open public issues containing vulnerabilities, secrets, personal data, or exploit details. Report privately to the project security owner once the private channel is established.

## Foundation controls

- no secrets in source control;
- validated environment configuration;
- structured logs with sensitive-field redaction;
- dependency, secret, and static checks in CI;
- non-root container runtime;
- private-by-default future object storage;
- tenant and authorization checks remain backend responsibilities;
- no production data in local or CI environments.

The current phase implements no authentication or business data. Security reviews are mandatory before Identity/Organization, channels, AI, voice, workflows, and billing.
