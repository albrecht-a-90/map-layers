# CLAUDE.md

Map layer management UI (React 19 + TypeScript + vedro).

## Commands

Yarn 4 via corepack (`packageManager` in package.json).

- `yarn dev` — dev server
- `yarn test` — Vitest (jsdom)
- `yarn typecheck` — `tsc -b` (also type-checks `*.test.ts`, incl. `@ts-expect-error` cases)
- `yarn lint` / `yarn format`
- Before finishing any change: `yarn typecheck && yarn lint && yarn test`
- `docker compose up --build` — production build behind nginx on :8080 (`docker/nginx.conf`)
- CI: `.github/workflows/ci.yml` (also runs `yarn format:check`); `main` deploys to GitHub Pages with `--base=/<repo>/` → any static asset URL added later must go through `import.meta.env.BASE_URL`

## Architecture boundaries

- `ui/` → renders, calls `services/` via `useServices()`. Never calls the API directly.
- `services/` → all async work (`layerLoader`). Writes to the store with **synchronous** dispatches only.
- `store/` → vedro store (`layersStore`), pure helpers (`layerActions`), URL sync.
- `api/` → `LayerApi` interface and the mock implementation.
- `map/` → lazy `MapView` (OpenLayers), `mapSync` (store → map layers via `store.on`, no React renders), synthetic field. Only `map/` imports `ol`.
- `domain/` → types and the layer catalog. No React, no I/O.

## vedro rules (verified in the package source, v1.1.0)

1. Every dispatch runs **every** `useSelector` and compares results with `JSON.stringify`
   → selectors return small values; never put large payloads in the store.
2. The selector is captured once on mount → components that select by id are rendered with `key={id}`.
3. `useDispatch()` returns a new function each render → don't pass it to memoised children.
4. Async dispatch captures `prevState` before `await` → don't use it; async lives in services.
5. Top-level keys can't be added after creation → `layers` and `order` are fixed.
6. An empty dispatch still notifies everyone → check before dispatching (`patchLayer`).

## Race-condition contract (`services/layerLoader.ts`)

A response is applied only if the layer is still enabled and its `status.requestId` matches.
AbortController is an optimisation; the requestId check is the guarantee.
Cancelling is not an error. Any change here needs a test in `layerLoader.test.ts`.

## Conventions

- Strict TS: no `any`, no non-null assertions, `assertNever` in every `switch` over a union.
- Branded `LayerId` — build ids with `toLayerId`.
- UI strings go through `useT()`; add keys to all dictionaries (`satisfies` enforces it).
- Styled Components with transient props (`$active`); colours from `theme` (CSS variables).
- Tests use `createControlledApi` (deterministic), not timers with randomness.
