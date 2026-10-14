import { LayerApiError, type LayerApi } from '../api/layerApi';
import type { LayerErrorCode, LayerId } from '../domain/layer.types';
import { patchLayer, readLayer } from '../store/layerActions';
import type { LayersStore } from '../store/layersStore';

export interface LayerLoader {
  setEnabled(id: LayerId, enabled: boolean): void;
  retry(id: LayerId): void;
  setOpacity(id: LayerId, opacity: number): void;
  /**
   * Loads every enabled layer that is neither loaded nor in flight — the initial
   * load from a shared URL, and recovery after StrictMode's dispose/remount.
   */
  resume(): void;
  /** Cancels everything in flight. The loader stays usable (StrictMode re-runs effects). */
  dispose(): void;
  /** Requests in flight — for leak tests. */
  readonly pendingCount: number;
}

export interface LayerLoaderDeps {
  readonly store: LayersStore;
  readonly api: LayerApi;
  readonly timeoutMs?: number;
}

class LayerTimeoutError extends Error {
  constructor() {
    super('Layer request timed out');
    this.name = 'LayerTimeoutError';
  }
}

interface Pending {
  readonly requestId: number;
  readonly controller: AbortController;
  readonly timer: ReturnType<typeof setTimeout>;
}

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Settles as soon as the signal aborts, even if the API ignores it —
 * otherwise a timeout against such an API would leave the layer loading forever.
 */
function rejectOnAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      reject(signal.reason instanceof Error ? signal.reason : new DOMException('Aborted', 'AbortError'));
    };
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

/**
 * Owns all async work for layers. Two guards against races:
 *  1. AbortController — a superseded request is cancelled (an optimisation);
 *  2. requestId + enabled check — a late response is dropped even if the API
 *     ignored the signal (the actual guarantee).
 */
export function createLayerLoader({
  store,
  api,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: LayerLoaderDeps): LayerLoader {
  const pending = new Map<LayerId, Pending>();
  let lastRequestId = 0;

  const cancel = (id: LayerId) => {
    const request = pending.get(id);
    if (!request) return;
    pending.delete(id);
    clearTimeout(request.timer);
    request.controller.abort();
  };

  const isCurrent = (id: LayerId, requestId: number) => {
    const layer = readLayer(store, id);
    return (
      layer !== undefined &&
      layer.enabled &&
      layer.status.kind === 'loading' &&
      layer.status.requestId === requestId
    );
  };

  const toErrorCode = (error: unknown, controller: AbortController): LayerErrorCode | null => {
    if (controller.signal.reason instanceof LayerTimeoutError) return 'timeout';
    if (controller.signal.aborted) return null; // cancelled on purpose — not an error
    if (error instanceof LayerApiError) return error.code;
    return 'network';
  };

  const load = async (id: LayerId) => {
    const layer = readLayer(store, id);
    if (!layer?.enabled) return;

    cancel(id);
    const requestId = ++lastRequestId;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort(new LayerTimeoutError());
    }, timeoutMs);
    pending.set(id, { requestId, controller, timer });
    patchLayer(store, id, { status: { kind: 'loading', requestId } });

    try {
      await rejectOnAbort(api.fetchLayer(id, { signal: controller.signal }), controller.signal);
      if (!isCurrent(id, requestId)) return;
      patchLayer(store, id, { status: { kind: 'success', requestId } });
    } catch (error) {
      const code = toErrorCode(error, controller);
      if (code === null || !isCurrent(id, requestId)) return;
      patchLayer(store, id, { status: { kind: 'error', requestId, error: code } });
    } finally {
      clearTimeout(timer);
      if (pending.get(id)?.requestId === requestId) pending.delete(id);
    }
  };

  return {
    setEnabled(id, enabled) {
      const layer = readLayer(store, id);
      if (!layer || layer.enabled === enabled) return;
      if (enabled) {
        patchLayer(store, id, { enabled: true });
        void load(id);
      } else {
        cancel(id);
        patchLayer(store, id, { enabled: false, status: { kind: 'idle' } });
      }
    },
    retry(id) {
      if (readLayer(store, id)?.status.kind === 'error') void load(id);
    },
    setOpacity(id, opacity) {
      if (!Number.isFinite(opacity)) return;
      const value = Math.min(1, Math.max(0, opacity));
      if (readLayer(store, id)?.opacity !== value) patchLayer(store, id, { opacity: value });
    },
    resume() {
      const layers = store.get('layers');
      for (const id of store.get('order')) {
        const layer = layers[id];
        if (
          layer?.enabled &&
          layer.status.kind !== 'success' &&
          layer.status.kind !== 'error' &&
          !pending.has(id)
        ) {
          void load(id);
        }
      }
    },
    dispose() {
      [...pending.keys()].forEach(cancel);
    },
    get pendingCount() {
      return pending.size;
    },
  };
}
