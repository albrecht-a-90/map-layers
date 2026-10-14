import type { LayerApi, LayerData } from '../api/layerApi';
import type { LayerId } from '../domain/layer.types';

export interface PendingCall {
  readonly id: LayerId;
  readonly signal: AbortSignal;
  resolve(data?: LayerData): void;
  reject(error: Error): void;
}

export interface ControlledApi extends LayerApi {
  readonly calls: PendingCall[];
  /** Most recent call, optionally for one layer. */
  last(id?: LayerId): PendingCall;
}

/**
 * Deterministic API for tests: every request waits until the test resolves or
 * rejects it, in any order. `respectAbort: false` imitates a backend client
 * that ignores AbortSignal.
 */
export function createControlledApi({ respectAbort = true }: { respectAbort?: boolean } = {}): ControlledApi {
  const calls: PendingCall[] = [];

  return {
    calls,
    last(id) {
      const call = id ? calls.findLast((c) => c.id === id) : calls.at(-1);
      if (!call) throw new Error(`No request${id ? ` for ${id}` : ''}`);
      return call;
    },
    fetchLayer(id, { signal }) {
      return new Promise<LayerData>((resolve, reject) => {
        if (respectAbort) {
          signal.addEventListener(
            'abort',
            () => {
              reject(new DOMException('Aborted', 'AbortError'));
            },
            { once: true },
          );
        }
        calls.push({
          id,
          signal,
          resolve: (data?: LayerData) => {
            resolve(data ?? { tileUrl: `/tiles/${id}/{z}/{x}/{y}.png` });
          },
          reject,
        });
      });
    },
  };
}

/** Lets pending promise callbacks run. */
export const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
