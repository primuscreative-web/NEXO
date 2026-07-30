# WhatsApp Cloud API activation

The MVP ships with the simulator enabled. To activate WhatsApp, configure a Meta App with WhatsApp product approval, a permanent system-user access token stored only in the deployment secret manager, Phone Number ID, Business Account ID, webhook verify token and app secret for signature validation. Configure the public webhook URL at the gateway and subscribe only to message/status fields. Do not place these values in `.env.example`, browser variables, screenshots or CI logs.

Before production activation, register the callback URL in Meta, verify signature fixtures in CI, set provider rate limits, and test a sandbox phone number. The adapter keeps external IDs as idempotency keys; raw webhook payloads are not persisted.
