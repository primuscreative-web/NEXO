# ADR-015 — Frontend Design System and Accessibility Foundation

**Status:** Accepted

## Context

Phase 1 intentionally shipped a minimal visual layer. Phase 2 must create a reusable design system, authenticated shell, themes, internationalization, accessibility validation and visual documentation while preserving the frozen modular-monolith and monorepo boundaries. Stitch provides the approved Nexus Precision direction but its static HTML is not production code.

## Problem

Keeping components inside the Web application would duplicate behavior and bind future surfaces to one route tree. Copying Stitch HTML or relying on ad-hoc CSS would preserve accessibility defects, fictional data and fixed colors. A full standalone documentation platform, however, can add substantial build and maintenance cost before the component API is stable.

The Architecture Freeze also identified the absence of a formal accessibility conformance target as a Phase 2 blocker.

## Alternatives evaluated

- App-local components with a single global stylesheet.
- Tailwind utility classes generated directly from Stitch exports.
- A shared UI package built from custom behavior for every interaction.
- A shared UI package using accessible headless behavior primitives and semantic CSS tokens.
- Storybook as a separate application from the first Phase 2 commit.
- An in-product, development-oriented UI Lab backed by the same production components.

## Decision

Create `@nexo/ui` under `packages/ui` with a three-layer token model: primitives, semantic aliases and component tokens. Applications consume semantic roles rather than raw palette values. Light and dark themes have equivalent contracts; the initial preference is `system`, resolved before hydration and persisted locally when changed.

Use Radix UI only for interaction-heavy, accessibility-sensitive primitives such as dialogs, menus, popovers, tabs, selections and focus-managed overlays. Use semantic native elements for simpler controls. Use Lucide React as the single icon set. Components expose typed variants and public contracts; application-specific data fetching and permissions stay outside the package.

Adopt WCAG 2.2 Level AA as the engineering conformance target. Keyboard operation, visible focus, reduced motion, landmarks, programmatic labels, status announcements and focus restoration are release requirements. Automated axe checks complement, but do not replace, keyboard and screen-reader-oriented review.

Use an internal UI Lab route as the Phase 2 visual and technical catalog. It documents tokens, variants, states and accessibility notes and is covered by component and visual tests. Defer Storybook until multiple independently deployed frontend consumers or external design-system contributors justify its additional build surface.

The Stitch Nexus Precision direction is translated into layered surfaces, restrained glass effects, electric indigo and aura-violet accents, compact enterprise density and clear hierarchy. Static HTML, CDN dependencies and prototype data are prohibited.

## Consequences

The Web app gains a reusable, framework-light UI boundary and a measurable accessibility baseline. Headless primitives reduce custom focus-management risk but add a dependency that must be monitored and tested. CSS tokens keep theming portable without forcing Tailwind into the monorepo. The UI Lab is cheaper than Storybook but does not yet provide its addon ecosystem or hosted collaboration workflow; this is an accepted Phase 2 limitation and a future re-evaluation trigger.
