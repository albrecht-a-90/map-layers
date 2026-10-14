# Map layers

Map layer management UI on **React 19 + TypeScript + vedro**. Temperature, wind and insolation
layers: on/off, opacity, `loading / success / error` status, retry after an error, a mocked API
request on enable. Loaded layers are drawn on a small OpenLayers map of Kyrgyzstan with
**synthetic** data.

**Live demo:** https://albrecht-a-90.github.io/map-layers/

## Run

```bash
corepack enable   # once, provides Yarn 4
yarn
yarn dev          # http://localhost:5173
yarn test
yarn typecheck && yarn lint
```

Docker: `docker compose up --build` → http://localhost:8080 (nginx serves the production build).
CI runs format check, lint, typecheck, tests, build and a Docker smoke test; `main` deploys to
GitHub Pages.

## Task requirements → where

| Requirement                    | Where                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| State in vedro                 | [store/layersStore.ts](src/store/layersStore.ts), [store/layerActions.ts](src/store/layerActions.ts) |
| On/off, opacity, status, retry | [services/layerLoader.ts](src/services/layerLoader.ts), [ui/LayerRow.tsx](src/ui/LayerRow.tsx)       |
| Mock API request on enable     | [api/mockLayerApi.ts](src/api/mockLayerApi.ts): 300–1500 ms, 20 % failures, honours abort            |
| Races on fast toggling         | `requestId` + `AbortController` in the loader; [tests](src/services/layerLoader.test.ts)             |
| Strict typing, no `any`        | `strict` + `exactOptionalPropertyTypes`, ESLint `strictTypeChecked`, type tests                      |
| No extra renders               | each row subscribes to its own layer; [`<Profiler>` tests](src/ui/LayerRow.render.test.tsx)          |
| 5 → 100+ layers                | normalised state; `?count=150` opens 150 layers                                                      |

## Architecture

```
ui/        LayerPanel → LayerRow (memo), StatusBadge     renders, calls services
services/  layerLoader                                    async work, races, timeouts
store/     vedro store { layers, order }, URL sync        state
api/       LayerApi + mock                                swappable via DI
map/       MapView (lazy), mapSync, OpenLayers adapter    store → map, outside React
domain/    types, layer catalog                           no React, no I/O
```

UI calls the loader → the loader calls the API and writes the result to the store with synchronous
dispatches → rows read their layer with `useSelector`; the map and the URL subscribe with
`store.on`.

### State

```ts
type LayerStatus =
  | { kind: 'idle' }
  | { kind: 'loading'; requestId: number }
  | { kind: 'success'; requestId: number }
  | { kind: 'error'; requestId: number; error: 'network' | 'server' | 'timeout' };

interface LayersState {
  layers: Record<LayerId, LayerState>; // { id, enabled, opacity, status }, O(1) by id
  order: LayerId[]; // the list depends on this only
}
```

Static descriptions (title, unit) live in a catalog, not in the store.

### Races

Every load gets a new `requestId` and `AbortController`; the previous request of the layer is
aborted. A response is applied only if the layer is still enabled and its `requestId` is current —
so a late response is dropped even if the API ignores `AbortSignal`. Disabling cancels the request
without an error. Requests time out after 10 s.

### Re-renders and scale

`LayerRow` is memoised, gets only `id` and selects `s.layers[id]`: changing one layer re-renders
one row; the list selects `order` only. The map applies opacity directly to its OpenLayers layer,
without React. At 150 layers every dispatch still runs every row's selector, which takes well under
a millisecond; virtualise the list if it grows another order of magnitude.

### vedro specifics (from the package source, v1.1.0)

- Every dispatch runs all selectors and compares results with `JSON.stringify` → selectors return
  small values.
- The selector is captured on mount → rows are keyed by `id`.
- Async dispatch reads `prevState` before `await` → async lives in the loader, not in the store.
- An empty dispatch still notifies everyone → updates are checked before dispatching.
- `useSelector` subscribes in `useEffect`, after the first render → a change made between a
  component's render and its effect is not seen until the next one. Not an issue here: child
  effects run before the parent's, so rows are subscribed before the loader resumes layers.
- No `useSyncExternalStore` → concurrent rendering may tear. Not an issue here either.

Both are small to fix in the library: a `useSyncExternalStore` adapter over `store.on('@state')`
covers the two at once.

### Beyond the task

- **Map:** a layer is shown while it is enabled and loaded; the first layer in the list is drawn
  on top. The data is generated, so the repository has no third-party datasets.
- **Shareable link:** `?layers=temperature,wind:60&count=20` (enabled layers, opacity in %, list
  size). Bad values are dropped; writes use `replaceState`, at most one per 300 ms.
- **UI languages:** Russian, Kyrgyz, English.

## Tests

`yarn test`, 60 tests: races (on→off→on, late responses with an API that ignores abort, old
error vs new success, 20 rapid toggles), timeouts and cleanup, re-renders at 150 layers (one row per change, the list never), store subscriptions
after 100 mount/unmount cycles, URL parsing and normalisation, map sync, types (`expectTypeOf`, `@ts-expect-error`).

## AI usage

**Claude Code** was used to read the vedro source, draft the plan, write code and tests, and
review them. I chose the scope and the stack and checked every change. Where it was wrong
and what was verified by hand: [AI-LOG.md](AI-LOG.md). Rules for the agent: [CLAUDE.md](CLAUDE.md).
