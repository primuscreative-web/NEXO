# WhatsApp Cloud API activation

The MVP ships with the simulator enabled. To activate WhatsApp, configure a Meta App with WhatsApp product approval, a permanent system-user access token stored only in the deployment secret manager, Phone Number ID, Business Account ID, webhook verify token and app secret for signature validation. Configure the public webhook URL at the gateway and subscribe only to message/status fields. Do not place these values in `.env.example`, browser variables, screenshots or CI logs.

Before production activation, register the callback URL in Meta, verify signature fixtures in CI, set provider rate limits, and test a sandbox phone number. The adapter keeps external IDs as idempotency keys; raw webhook payloads are not persisted.

The production callback is `https://www.agentenexo.com.br/api/webhooks/meta`.
Subscribe the WhatsApp Business Account only to the `messages` field. The
runtime validates `X-Hub-Signature-256`, rejects malformed JSON and maps the
configured phone number to one explicit NEXO organization.

Required server-side variables:

- `META_APP_ID`
- `META_APP_SECRET`
- `META_WEBHOOK_VERIFY_TOKEN`
- `META_GRAPH_API_VERSION`
- `META_WHATSAPP_ACCESS_TOKEN`
- `META_WHATSAPP_PHONE_NUMBER_ID`
- `META_WHATSAPP_BUSINESS_ACCOUNT_ID`
- `META_WHATSAPP_ORGANIZATION_ID`

Optional non-secret display configuration: `META_WHATSAPP_INBOX_NAME`.

The integration status becomes `connected` only when the Meta Graph API
confirms the phone number, WABA and application subscription. Environment
presence alone remains insufficient.
