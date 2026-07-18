# Theme strategy

NEXO supports `light`, `dark` and `system`. The default preference is `system`; explicit preferences are stored under `nexo-theme` in `localStorage`. No authentication token or tenant data is stored with it.

An inline bootstrap resolver applies `data-theme` before React hydration, preventing a light-theme flash on dark systems. `ThemeProvider` listens to system changes only while resolving the system preference. Both themes implement the same semantic token names; dark mode follows the layered Nexus Precision direction, while light mode has independently tuned contrast and elevation.

Theme changes are available in the topbar and command palette. Animations use central durations and become zero-duration under `prefers-reduced-motion`.
