# Authenticated shell and navigation

The canonical authenticated surface uses `/dashboard`, module routes and `/settings/*`. Legacy `/app/*` routes redirect to the equivalent canonical location.

`apps/web/src/lib/navigation.tsx` is the single route metadata source: path, label, description, icon, group, breadcrumbs, permission, feature status, planned phase, optional shortcut, visibility and mobile availability. The client may hide or disable inaccessible actions, but backend authorization remains authoritative.

The shell contains a responsive sidebar/mobile drawer, organization switcher, grouped navigation, topbar, breadcrumbs, global-search trigger, command palette, theme control, user menu, toast region and a disabled Copilot placeholder. Future modules render explicit phase placeholders and no invented data.

The command palette supports `Ctrl+K` and `Cmd+K`, filtered keyboard navigation, theme changes, organization switching, real Phase 1 actions and logout. Focus is managed by the dialog primitive and returns to the trigger on close.
