# Delegation Console — EIP-7702

A client-side web tool for managing [EIP-7702](https://eips.ethereum.org/EIPS/eip-7702) delegations on an externally owned account (EOA) derived from a mnemonic. Sign a delegation to a smart-wallet contract, inspect what an account is currently delegated to on every supported chain, or revoke delegations everywhere in one click.

Everything runs in your browser. The mnemonic is used locally to derive the account and sign; **keys never leave the page**, and there is no backend.

## What it does

- **Delegate** — signs an EIP-7702 authorization for a chosen contract and submits a self-sponsored transaction (`executor: 'self'`) carrying the authorization list, then verifies the delegation landed by checking the account's code for the `0xef0100` designator.
- **Check delegations** — reads the account's code on every supported chain in parallel and shows what it is delegated to, with friendly labels for known targets and block-explorer links.
- **Revoke all chains** — signs an authorization for the zero address on every chain at once, clearing the delegation everywhere. Chains where the account has no gas simply fail and can be ignored.

## Supported chains

Ethereum Mainnet, Unichain, Optimism, Base, BSC, Arbitrum One, Celo, Polygon, Monad, Tempo, and Robinhood Chain.

## Delegate presets

| Preset | Address | Notes |
|--------|---------|-------|
| Uniswap v1.1 (latest) | `0x000000005c84F8Fd50b21CAC312528A64437030e` | [Calibur](https://github.com/Uniswap/calibur) v1.1.0 |
| Uniswap v1.0 (old) | `0x000000009B1D0aF20D8C6d0A44e162d11F9b8f00` | Calibur v1.0.0 |
| MetaMask | `0x63c0c19a282a1b52b07dd5a65b58948a07dae32b` | MetaMask 7702 delegator |
| Alchemy | `0x69007702764179f14F51cdce752f4f775d74E139` | [Modular Account v2](https://www.alchemy.com/docs/wallets/transactions/using-eip-7702) |
| Zero address | `0x0000000000000000000000000000000000000000` | Undelegate |

Each preset is only offered on chains where the contract is deployed; you can always paste any address manually.

## Getting started

Requires [bun](https://bun.sh) — it is the package manager and the runtime for all scripts.

```sh
bun install
bun run dev     # dev server on http://localhost:3000 (Turbopack)
bun run build   # production build
bun run lint    # ESLint
```

## Security notes

- The recovery phrase is processed entirely client-side and masked in the UI once entered (toggle with the eye icon).
- Delegating an EOA to a contract hands that contract full control of the account on that chain. Only delegate to contracts you trust, and prefer audited, well-known targets.
- Transactions spend gas from the derived account itself — it must be funded on the target chain.
- This is an operational tool, not a wallet. Treat any machine you type a mnemonic into as security-critical.

## How it works

Built with Next.js 16 (App Router), React 19, viem, react-hook-form + zod, Tailwind, and shadcn/ui. The form derives an `HDAccount` with `mnemonicToAccount` at the chosen derivation index, creates a viem wallet client for the selected chain (with keyless public RPC fallbacks for mainnet), signs the authorization with `signAuthorization`, and sends a 0-value self-transaction carrying the `authorizationList`. Delegation state is read back via `getCode` and the EIP-7702 `0xef0100 || address` designator.
