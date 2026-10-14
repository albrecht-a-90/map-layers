import type { LayerCatalog } from '../domain/layerCatalog';
import { LayerApiError, type LayerApi } from './layerApi';

export interface MockApiOptions {
  /** Random latency range, ms. */
  readonly latency: readonly [min: number, max: number];
  /** 0..1 */
  readonly failRate: number;
}

const DEFAULT_MOCK_OPTIONS: MockApiOptions = { latency: [300, 1500], failRate: 0.2 };

const abortReason = (signal: AbortSignal): Error =>
  signal.reason instanceof Error
    ? signal.reason
    : new DOMException('The operation was aborted.', 'AbortError');

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(abortReason(signal));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortReason(signal));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

/** Simulated backend: random latency and failures. Honours AbortSignal. */
export function createMockLayerApi(
  catalog: LayerCatalog,
  initial: Partial<MockApiOptions> = {},
  { random = Math.random }: { random?: () => number } = {},
): LayerApi {
  const options: MockApiOptions = { ...DEFAULT_MOCK_OPTIONS, ...initial };

  return {
    async fetchLayer(id, { signal }) {
      const [min, max] = options.latency;
      const fails = random() < options.failRate;
      await delay(min + random() * (max - min), signal);
      if (!catalog.get(id)) throw new LayerApiError('server', `Unknown layer ${id}`);
      if (fails) throw new LayerApiError(random() < 0.5 ? 'network' : 'server');
      return { tileUrl: `/tiles/${id}/{z}/{x}/{y}.png` };
    },
  };
}
