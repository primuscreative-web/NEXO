# Component contracts

Public components are exported only by `@nexo/ui`. Application data fetching, authorization and business rules do not belong in the UI package.

Variants are typed with class-variance-authority where combinations are meaningful. Interactive components cover disabled, loading, selected and invalid behavior through native attributes or public props. Destructive styling never grants destructive permission; APIs remain authoritative.

Every icon-only action requires an accessible label. FormField connects labels, descriptions and errors to controls. Dialogs, menus, popovers, drawers and sheets use focus-managed primitives. Tables include captions and a horizontal overflow strategy. Page states use icon and text so color is never the only signal.

The package source is consumed by Next.js so individual `use client` boundaries are preserved. Its distributable build remains a required CI artifact and verifies public types; Web does not import `packages/ui/src/*` directly.
