# Tokens

The source of truth is `packages/ui/src/tokens.css`.

| Layer     | Purpose                                  | Example                         |
| --------- | ---------------------------------------- | ------------------------------- |
| Primitive | Internal palette and raw scale           | `--nexo-indigo-600`             |
| Semantic  | Product meaning independent of theme     | `--nexo-primary`, `--nexo-info` |
| Component | Stable control and layout implementation | `--nexo-control-border`         |

The contract covers background, layered surfaces, foreground, muted content, borders, primary/secondary/accent, status colors, AI, focus and overlay; heading/body/code typography; a four-pixel spacing scale; radii; shadows; z-index; motion; container, header and sidebar dimensions.

Components must not choose palette primitives directly when a semantic token exists. A new token requires a real repeated meaning, an equivalent light/dark definition and visual/accessibility verification. Density uses the same scale and leaves room for future comfortable/compact contexts without adding a Phase 2 selector.
