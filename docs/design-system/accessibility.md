# Accessibility

WCAG 2.2 Level AA is the Phase 2 engineering target. Automated checks block serious and critical axe findings on login, the authenticated shell/dashboard and the UI Lab.

Release expectations include:

- keyboard operation and visible `focus-visible` indicators;
- skip link, banner/navigation/main landmarks and ordered headings;
- programmatic labels, descriptions, error messages and `aria-live` feedback;
- focus containment and restoration for overlays;
- captions and scoped headers for tables;
- non-color status cues, responsive zoom/reflow and reduced motion;
- touch targets and mobile navigation usable without a mouse.

Automation cannot fully validate screen-reader phrasing, cognitive clarity or every contrast composition. Manual keyboard review remains required for new primitives and major shell changes.
