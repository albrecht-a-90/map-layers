import { MAX_LAYER_COUNT, type LayerCatalog } from '../domain/layerCatalog';
import { toLayerId, type LayerId } from '../domain/layer.types';
import { createInitialLayersState, type LayersState, type LayersStore } from './layersStore';

/**
 * Shareable view state in the query string:
 *   ?layers=temperature,wind:60&count=150
 * enabled layers in list order, optional opacity in percent; how many layers the list shows.
 */
export interface UrlState {
  readonly layers: ReadonlyArray<{ readonly id: LayerId; readonly opacity: number }>;
  readonly count: number | undefined;
}

const LAYERS = 'layers';
const COUNT = 'count';

const toCount = (value: string | null): number | undefined => {
  const count = Number(value);
  return value !== null && Number.isInteger(count) && count >= 1 && count <= MAX_LAYER_COUNT
    ? count
    : undefined;
};

/** Unknown ids and malformed values are dropped, never thrown on — the URL is user input. */
export function parseUrlState(search: string, catalog: LayerCatalog): UrlState {
  const params = new URLSearchParams(search);
  const seen = new Set<LayerId>();
  const layers: Array<{ id: LayerId; opacity: number }> = [];
  for (const token of (params.get(LAYERS) ?? '').split(',')) {
    const [rawId = '', rawOpacity] = token.split(':');
    const id = toLayerId(rawId.trim());
    if (!catalog.get(id) || seen.has(id)) continue;
    seen.add(id);
    // `wind:` (empty value) is malformed, not 0 %
    const percent = rawOpacity?.trim() ? Number(rawOpacity) : 100;
    const opacity = Number.isFinite(percent) ? Math.min(100, Math.max(0, Math.round(percent))) / 100 : 1;
    layers.push({ id, opacity });
  }
  return { layers, count: toCount(params.get(COUNT)) };
}

/** Writes the enabled layers; other params (including `count`) are kept as they are. */
export function serializeUrlState(state: LayersState, search = ''): string {
  const params = new URLSearchParams(search);
  const enabled = state.order
    .map((id) => state.layers[id])
    .filter((layer) => layer?.enabled)
    .map((layer) => {
      if (!layer) return '';
      const percent = Math.round(layer.opacity * 100);
      return percent === 100 ? layer.id : `${layer.id}:${percent}`;
    });
  params.delete(LAYERS);
  if (enabled.length > 0) params.set(LAYERS, enabled.join(','));
  const query = params.toString().replaceAll('%2C', ',').replaceAll('%3A', ':');
  return query ? `?${query}` : '';
}

/**
 * Initial store state for a URL. Enabled layers are marked enabled with status
 * `idle`; the loader's `resume()` then fetches them. The list is long enough to
 * contain every linked layer, even if `count` says otherwise.
 */
export function initialStateFromUrl(
  search: string,
  catalog: LayerCatalog,
  defaultCount: number,
): LayersState {
  const url = parseUrlState(search, catalog);
  const count = Math.max(url.count ?? defaultCount, ...url.layers.map(({ id }) => catalog.indexOf(id) + 1));
  const state = createInitialLayersState(catalog.first(count));
  const layers = { ...state.layers };
  for (const { id, opacity } of url.layers) {
    const layer = layers[id];
    if (layer) layers[id] = { ...layer, enabled: true, opacity };
  }
  return { ...state, layers };
}

/** Mirrors the store into the URL (replaceState, throttled — a slider must not flood history). */
export function createUrlSync(
  store: LayersStore,
  { read, write, delayMs = 300 }: { read: () => string; write: (search: string) => void; delayMs?: number },
): { dispose(): void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const flush = () => {
    timer = undefined;
    const next = serializeUrlState(store.get(), read());
    if (next !== read()) write(next);
  };
  const schedule = () => {
    timer ??= setTimeout(flush, delayMs);
  };
  // `store.on` runs the callback once on subscribe → the first flush rewrites a
  // malformed shared URL into its normalised form
  const unsubscribers = [store.on('layers', schedule), store.on('order', schedule)];
  return {
    dispose() {
      unsubscribers.forEach((unsubscribe) => {
        unsubscribe();
      });
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    },
  };
}
