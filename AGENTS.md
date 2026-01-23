# Polymarket Portal - Agent Guide

## Scope
- This file is authoritative for repository behavior.
- Prefer minimal changes in `src/App.vue` unless a new module is required.
- Keep existing UI wording unless the product spec asks otherwise.
- No Cursor/Copilot instruction files are present in this repo.

## Commands
- Install: `npm install`
- Dev server: `npm run dev`
- Production build: `npm run build`
- Preview build: `npm run preview`
- Lint: not configured (no ESLint/Prettier scripts in `package.json`).
- Tests: not configured (no test runner or test files found).
- Single test: not available until a test runner is added.
- Script runner: `npx tsx src/scripts/<file>.ts` (scripts read `.env` via dotenv).

## Project Layout
- `src/main.ts` mounts the Vue app and applies the Buffer polyfill.
- `src/App.vue` owns the main layout and page switching.
- `src/pages/` contains full-page views (wallets, workbench, positions, deposit, withdraw).
- `src/components/` contains reusable UI and modal components.
- `src/composables/` contains action hooks such as `useXxxActions`.
- `src/services/` handles API calls, wallet vault, balances, and side effects.
- `src/utils/` holds stateless helpers (formatting, parsing, toast).
- `src/shared/` stores chain ABIs, config, and script utilities.
- `src/data/` contains mock data utilities (use only when explicitly needed).
- `src/styles.css` defines Tailwind layers and theme tokens.

## Vue + TypeScript Conventions
- Use Vue 3 Composition API with `<script setup lang="ts">`.
- Prefer `ref`/`reactive` with explicit generic types for state.
- Centralize shared types in `src/types.ts` and import them.
- Use `import type` for type-only imports.
- Keep imports grouped: external packages first, then local modules.
- Components use PascalCase filenames and imports.
- Composables are named `useXxxActions` and accept a dependency object.
- Use `number | null` for optional numeric values; avoid `undefined`.
- Prefer `const` over `let`; avoid `var`.
- Favor small helpers in `src/utils/` over inline duplication.
- Use `computed` for derived state and `watch` for side effects.
- Use `Array<T>` or `Record<string, T>` for complex collections.
- Prefer explicit union string types for statuses (ex: `"OPEN" | "RESOLVED"`).

## Naming and Types
- Variables and functions use `camelCase`; classes and components use `PascalCase`.
- Constants use `UPPER_SNAKE_CASE` when truly global or static.
- Service files are `camelCase` and export named functions.
- Component props are typed via `defineProps<{ ... }>()`.
- Component emits use a `type Emits` + `defineEmits<Emits>()` pattern.
- Prefer `type` aliases over `interface` (matches existing usage).
- Avoid `any`; use `unknown` with narrowing when needed.
- Keep IDs as strings (see `Wallet`, `WalletPair`, `PositionRow` types).
- Use `null` to mean "not loaded" rather than sentinel numbers.

## Formatting
- Indentation is 2 spaces in `src/` Vue/TS files.
- Use double quotes and semicolons (matches most frontend files).
- Follow the local file style if a file already differs (scripts in `src/scripts/` use single quotes).
- Keep lines readable; split long template attributes or arrays as needed.
- Align multi-line object literals and arrays with trailing commas only if already present.

## Error Handling and Data Safety
- Always check `response.ok` before reading JSON; throw `Error` with a user-facing message.
- Guard JSON parsing with `try/catch` and return sane defaults.
- For browser-only APIs (`window`, `localStorage`, `crypto`), guard with `typeof window !== "undefined"`.
- Use early returns for validation failures and log/toast actionable messages.
- Do not fabricate data on API failures; surface errors instead.
- When parsing external input (CSV, URL), trim and normalize fields.

## API and Services
- Keep network logic inside `src/services/`; UI components should call service helpers.
- Use `fetch` with `encodeURIComponent` and `URLSearchParams` for query strings.
- Prefer Vite proxy routes (`/api/market`, `/api/book`, etc.) over hardcoded hosts.
- Keep error strings user-facing and localized to existing tone.
- Reuse balance utilities in `src/services/balanceService.ts` for on-chain calls.
- Cache providers/contracts per RPC URL; do not recreate them on every call.

## State and Storage
- Wallets and pairs are reactive arrays; mutate via `splice` to preserve reactivity.
- Persist secrets through `saveVault`/`decryptVault` in `src/services/walletVault.ts`.
- Keep wallet IP config consistent with `src/services/walletIpCache.ts`.
- Use `createToastHelpers` for user notifications instead of ad-hoc alerts.
- Avoid mutating reactive objects outside Vue state helpers.

## UI and Styling
- Use Tailwind utility classes for layout; avoid inline styles.
- Theme tokens live in `src/styles.css`; themes toggle via `theme-dark`/`theme-light`.
- Keep modals in `src/components/` and pages in `src/pages/`.
- Use `v-show` for page switching in `src/App.vue` to preserve state.
- Keep table row selection state on each row object (`selected` boolean).

## Domain Rules (must follow)
### General
- This file is authoritative for product behavior.
- Prefer minimal changes in `src/App.vue` unless a new module is required.

### Wallet Management
- After importing a private key, parse the address with `ethers.Wallet`.
- Do not create mock wallets; initial state must be empty until import.
- CSV export must include only `privateKey` with header `privateKey`.
- Local key caching uses AES-GCM symmetric encryption; store ciphertext and key in `localStorage` (no passphrase).
- Decrypt and restore wallets automatically on page load.

### Market Loading
- Load markets by slug via `/api/market?slug=...` (Vite proxies to Gamma `/markets`).
- Load order book depth via `/api/book?token_id=...` (Vite proxies to CLOB `/book`).
- Refresh only on user action; no auto-refresh polling.
- If order book fetch fails, surface the error and do not insert fake depth.
- Provide an "进入市场" hyperlink button to the live market.

### Order Book Depth
- Default to showing asks (sell orders) only; allow toggling to bids.
- Show top 3 levels for both bids and asks.
- Each level shows the value in U.
- Depth bars: green for bids, red for asks; ensure stronger contrast in dark mode.
- When showing sell-only, the title total label must be "卖一合计".

### Execution Parameters
- Support a unified amount plus per-pair overrides (configured in a modal).
- Wallet pair list shows a "单独/统一" marker for per-pair vs unified.
- Support execution order YES→NO or NO→YES.
- Support a random delay range with `max >= min`.
- Estimated trade value uses the per-pair amount when present.

### Deposit / Withdraw
- Deposit and withdraw flows should not use explanatory modals.
- Deposit supports random amount ranges.
- Balance queries only apply to selected rows.
- The table header checkbox toggles select all / select none.

### Modal Rules
- Keep only necessary modals (platform intro, workbench intro, wallet pair config, wallet IP config).
- Do not add new auto-open modals unless explicitly requested.

### IP / Wallet Association
- Each wallet stores `ipName` and `ipEndpoint` fields.
- Configure IP via the row-level modal; no separate IP list page.
- Persist IP values alongside wallet import/export and vault storage.

## Notes for Agents
- The app is frontend-only and uses Vite dev server proxy rules in `vite.config.ts`.
- Do not add backend services or mock data unless explicitly required.
- Keep changes localized; prefer helpers over rewriting large templates.
- When adding new state, align with existing `ref`/`reactive` patterns.
- Update this file if you add lint/test tooling or new agent rules.
