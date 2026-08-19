# live-show-react

Next.js frontend for live-show.

## Workspace

This app is part of the pnpm workspace rooted at the repository root
(`pnpm-workspace.yaml`). It consumes `@live-show/design-system`
(`packages/design-system`) via `workspace:*`, compiled through
`transpilePackages` — the package ships as TS/SCSS source with no build step.

Install and build **from the workspace root**, not from this directory:

```bash
pnpm install                       # root — resolves the whole workspace
pnpm --filter live-show build      # or: dev, test, tsc --noEmit
```

There is no local `pnpm-lock.yaml` here anymore — the root lockfile is the
single source of truth. Do not add one back.
