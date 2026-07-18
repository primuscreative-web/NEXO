# Visual regression and performance budgets

Playwright snapshots cover login, dashboard/shell, members, teams and settings in desktop and mobile viewports, including light and dark critical states. Tests use deterministic isolated responses and clearly synthetic test identities; they never access production or developer data.

To review an intentional visual change:

1. run the full build and component/accessibility tests;
2. execute `pnpm test:visual` and inspect diffs;
3. update with `pnpm test:visual:update` only after conscious review;
4. commit the new baselines with the implementation and describe the change in the PR.

Initial uncompressed production-build budgets are enforced by `pnpm bundle:check`:

| Asset measurement         | Budget      |
| ------------------------- | ----------- |
| All Next static JS chunks | 1,250,000 B |
| Largest JS chunk          | 250,000 B   |
| All Next static CSS       | 70,000 B    |

These are regression tripwires, not user-performance SLOs. Revisit them with route-level telemetry, compression and real-user data. Heavy future modules must load on demand; Server Components remain the default outside interactive leaf boundaries.
