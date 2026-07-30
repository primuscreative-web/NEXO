# WhatsApp Cloud API — production activation

## Approved scope

Only the official Meta WhatsApp Cloud API is enabled. Instagram and unofficial
WhatsApp Web automation remain disabled.

## Runtime contract

- Callback: `https://www.agentenexo.com.br/api/webhooks/meta`
- Health: `https://www.agentenexo.com.br/api/webhooks/health/ready`
- Webhook field: `messages`
- Token location: Render secret manager only
- Tenant mapping: `META_WHATSAPP_ORGANIZATION_ID`
- Phone mapping: `META_WHATSAPP_PHONE_NUMBER_ID`
- Graph version: `META_GRAPH_API_VERSION`

The callback validates the verification token and the
`X-Hub-Signature-256` HMAC before parsing JSON. Replayed deliveries are
idempotent. Inbound messages are normalized into Inbox records; raw webhook
payloads and provider secrets are not persisted.

## Provider permissions

The permanent system-user token must be scoped to the NEXO app and WABA with
the minimum permissions required by Meta:

- `whatsapp_business_messaging`
- `whatsapp_business_management`

Do not add catalog or advertising permissions unless a later approved feature
requires them.

## Safe activation order

1. Confirm the NEXO Meta app and WABA ownership.
2. Add or register the approved business phone number.
3. Create a system user and assign only the NEXO app and WhatsApp asset.
4. Generate the permanent token with the minimum permissions.
5. Save all secrets directly in Render; never copy them to documentation.
6. Configure the callback and verification token in Meta.
7. Subscribe the app to the WABA `messages` webhook.
8. Confirm the NEXO diagnostic reports provider and webhook healthy.
9. Send a controlled inbound text, image and audio message.
10. Reply from the NEXO Inbox and confirm sent/delivered/read transitions.

## Connected criteria

The card may show `Conectado` only after all required variables exist, Meta
returns the expected phone and WABA identifiers, and the WABA lists the NEXO
app as subscribed. A real inbound and outbound smoke is still recorded
separately as production evidence.

## Known limitation

Media webhooks are normalized with private Meta media identifiers. Download to
private object storage is not enabled until the storage adapter and retention
policy are approved; the Inbox therefore displays a safe media placeholder.
