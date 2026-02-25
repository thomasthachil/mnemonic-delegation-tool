# AGENTS.md

## Cursor Cloud specific instructions

This is a **Mnemonic Delegation Tool** — a client-side Next.js 15 app for delegating Ethereum EOAs to smart wallet contracts via EIP-7702. There is no backend, no database, and no test suite.

### Quick reference

| Action | Command |
|--------|---------|
| Install deps | `npm install --legacy-peer-deps` |
| Dev server | `npm run dev` (port 3000) |
| Lint | `npm run lint` |
| Build | `npm run build` |

### Non-obvious caveats

- **Package manager**: Both `package-lock.json` and `pnpm-lock.yaml` exist, but the pnpm lockfile is essentially empty. Use **npm** with `--legacy-peer-deps` (required due to `react-day-picker@8` requiring `date-fns@^2||^3` while the project uses `date-fns@4`).
- **ESLint**: The repo ships without an ESLint config file. One must be created (`.eslintrc.json` with `{"extends": "next/core-web-vitals"}`) and `eslint@^8` + `eslint-config-next@15.2.4` must be installed as dev dependencies for `npm run lint` to work. ESLint 9+ is incompatible with Next.js 15's lint runner.
- **Build flags**: `next.config.mjs` sets `ignoreDuringBuilds: true` for both ESLint and TypeScript, so `npm run build` will succeed even if there are lint/type errors.
- **No automated tests**: There is no test framework or test files in this project.
- **Blockchain interaction**: Submitting a delegation transaction requires a funded wallet on the chosen chain. For development, the form can be filled and submitted to verify the UI and RPC logic work — an "insufficient funds" error from the RPC confirms end-to-end client-side logic is functional.
