# AI log

Tool: **Claude Code** (CLI / VS Code). Every change was reviewed and run locally before being kept.

## What it was used for

- **Reading vedro's source.** The README doesn't describe the behaviour that matters, so Claude
  unpacked the npm package and read the implementation. The findings shaped the architecture (see
  "vedro specifics" in the README): small selectors, rows keyed by id, async outside the store,
  checks before dispatching.
- **Plan.** Claude drafted a plan from the task; I chose the scope and the stack.
- **Code and tests.** Scaffold (Vite, strict TS, ESLint, Prettier, Husky, Vitest), the loader and
  its race tests, the components, the map sync.
- **Review.** Separate review passes over the finished code.

## Where it was wrong, and what I fixed

- **Timeouts.** The first loader relied on the API honouring `AbortSignal`: with an API that
  ignores it, a timed-out layer would stay `loading` forever. Fixed with `rejectOnAbort`; tested
  with such an API.
- **`<html lang>`** stayed `ru` after switching the UI language. Fixed, covered by a test.
- **Input edge cases** found in review: `?layers=wind:` was read as 0 % opacity, and
  `setOpacity(NaN)` stored `NaN`. Fixed, with tests.
- **Final review.** Each row had two live regions (the status badge and the opacity `<output>`),
  so screen readers announced every slider step; the map sync called `sync()` by hand although
  vedro's `store.on` already runs the callback on subscribe. The render claims were tested on 20
  rows only — now on 150, plus a test that the list itself never re-renders.
- **StrictMode.** Its dev remount cancelled the requests for layers from a link. Instead of
  guarding against StrictMode, `resume()` loads whatever is enabled but neither loaded nor in
  flight.

## What I checked by hand

- **Tests can fail.** The render test was run with a row subscribed to all layers, the list test
  with the list subscribed to the whole state, the map test without the "only loaded layers" rule,
  the edge-case tests without their fixes — each failed.
- **Browser.** Headless Edge with StrictMode on: toggling, random failures, retry, opacity, the map.
- **Docker.** Response headers checked with `curl`: `no-cache` on `index.html`, `immutable` on
  hashed assets.
- **Tooling.** TypeScript 7 is outside typescript-eslint's supported range → pinned TS 6.0. vedro
  ships CommonJS, so it is inlined in the Vitest config to get the same import as in the browser.
- **Kyrgyz translation** is machine-assisted and should be reviewed by a native speaker.
