# AGENTS.md

## Cursor Cloud specific instructions

This is a **Mnemonic Delegation Tool** — a client-side Next.js 16 app for delegating Ethereum EOAs to smart wallet contracts via EIP-7702. There is no backend, no database, and no test suite.

### Quick reference

| Action | Command |
|--------|---------|
| Install deps | `bun install` |
| Dev server | `bun run dev` (port 3000, Turbopack) |
| Lint | `bun run lint` |
| Build | `bun run build` |

### Non-obvious caveats

- **Package manager**: Uses **bun**. The lockfile is `bun.lock`. Old `package-lock.json` and `pnpm-lock.yaml` have been removed.
- **ESLint**: Uses ESLint 9 flat config (`eslint.config.mjs`) with `eslint-config-next@16`. The lint script runs `eslint .` directly (not `next lint`, which was removed in Next.js 16).
- **React 19.2 hooks rules**: The `react-hooks` ESLint plugin v7 (bundled with the Next.js 16 config) enforces stricter rules — `set-state-in-effect` and `purity`. The `setMounted` pattern uses `useSyncExternalStore` instead of `useState`+`useEffect` to satisfy these rules.
- **Build flags**: `next.config.mjs` sets `ignoreBuildErrors: true` for TypeScript. The `eslint.ignoreDuringBuilds` option was removed in Next.js 16.
- **No automated tests**: There is no test framework or test files in this project.
- **Blockchain interaction**: Submitting a delegation transaction requires a funded wallet on the chosen chain. For development, the form can be filled and submitted — an "insufficient funds" error from the RPC confirms end-to-end client-side logic is functional.
- **Bun installation**: Bun must be on `$PATH`. It is installed to `~/.bun/bin/bun`; ensure `~/.bashrc` sources correctly or add `~/.bun/bin` to `$PATH`.
