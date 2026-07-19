# NEXO Design System — Nexus Precision

`@nexo/ui` is the official, application-agnostic visual contract for NEXO. It provides semantic CSS tokens, typed React variants, accessible behavior primitives and stable public exports. The Web app consumes the package through the monorepo workspace and never imports its private implementation paths.

## Architecture

The token chain is `primitive → semantic → component`. Product code consumes names such as `--nexo-surface`, `--nexo-foreground`, `--nexo-danger` and `--nexo-control-border`; primitive palette values remain internal to the token file. Light and dark themes expose the same semantic contract.

The package groups its public API into:

- actions: Button and IconButton;
- forms: inputs, selects, combobox, checkbox, radio group, switch and FormField;
- display: cards, badges, alerts, avatar, tables, status and timeline;
- overlays: tooltip, popover, menus, dialogs, drawer, sheet and scroll area;
- navigation: breadcrumb, tabs, accordion, pagination and keyboard shortcuts;
- feedback: skeleton, spinner, progress, toast and global page states;
- composition: command palette, user menu and organization switcher.

Complex focus-managed behavior uses Radix primitives. Native semantic HTML remains the default for simpler controls. Lucide React is the only system icon family.

## Development catalog

The authenticated route `/settings/design-system` is the executable UI Lab. It renders production components, variants, states and accessibility notes. It contains explicitly marked component examples, never product metrics presented as real data.

Storybook is intentionally deferred by ADR-015. The UI Lab avoids a second application and addon surface while NEXO has one frontend consumer. Re-evaluate Storybook when independent frontend applications or external design-system contributors need isolated publishing and review.

## Commands

```powershell
pnpm --filter @nexo/ui build
pnpm --filter @nexo/ui test:unit
pnpm --filter @nexo/ui test:components
pnpm test:a11y
pnpm test:visual
```

See [tokens](./tokens.md), [themes](./themes.md), [components](./components.md) and [accessibility](./accessibility.md).
