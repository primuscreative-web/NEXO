# Internationalization and timezone

`pt-BR` is the initial locale. System navigation and reusable messages use typed namespace keys in `apps/web/src/lib/i18n.ts`, with interpolation and plural selection. Technical identifiers, role keys and permission keys are not translated.

Formatting is centralized in `apps/web/src/lib/format.ts`. Timezone resolution is:

1. active organization timezone;
2. user timezone;
3. browser-resolved timezone.

Dates, date-times, numbers and BRL currency must use these helpers instead of scattered `toLocaleString` calls. A dedicated i18n runtime is deferred until a second locale and runtime switching are approved; the typed catalog is the current contract.
