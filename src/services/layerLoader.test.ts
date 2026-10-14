import Vedro from 'vedro';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LayerApiError } from '../api/layerApi';
import { defaultCatalog } from '../domain/layerCatalog';
import { toLayerId, type LayerStatus } from '../domain/layer.types';
import { readLayer } from '../store/layerActions';
import { createInitialLayersState, type LayersState, type LayersStore } from '../store/layersStore';
import { createControlledApi, flush, type ControlledApi } from '../test/controlledApi';
import { createLayerLoader, type LayerLoader } from './layerLoader';

const TEMP = toLayerId('temperature');
const WIND = toLayerId('wind');

let store: LayersStore;
let api: ControlledApi;
let loader: LayerLoader;

function setup({ respectAbort = true, timeoutMs = 10_000 } = {}) {
  store = new Vedro<LayersState>(createInitialLayersState(defaultCatalog.first(3)));
  api = createControlledApi({ respectAbort });
  loader = createLayerLoader({ store, api, timeoutMs });
}

const status = (id = TEMP): LayerStatus | undefined => readLayer(store, id)?.status;

beforeEach(() => {
  setup();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('layerLoader: basic flow', () => {
  it('enabling a layer requests data and ends in success', async () => {
    loader.setEnabled(TEMP, true);
    expect(status()).toEqual({ kind: 'loading', requestId: 1 });
    expect(api.calls).toHaveLength(1);

    api.last().resolve();
    await flush();

    expect(status()).toEqual({ kind: 'success', requestId: 1 });
  });

  it('error → retry → success', async () => {
    loader.setEnabled(TEMP, true);
    api.last().reject(new LayerApiError('server'));
    await flush();
    expect(status()).toEqual({ kind: 'error', requestId: 1, error: 'server' });

    loader.retry(TEMP);
    expect(status()).toEqual({ kind: 'loading', requestId: 2 });
    api.last().resolve();
    await flush();
    expect(status()).toEqual({ kind: 'success', requestId: 2 });
  });

  it('retry does nothing unless the layer is in error', () => {
    loader.setEnabled(TEMP, true);
    loader.retry(TEMP);
    expect(api.calls).toHaveLength(1);
  });

  it('unknown errors are reported as network errors', async () => {
    loader.setEnabled(TEMP, true);
    api.last().reject(new TypeError('Failed to fetch'));
    await flush();
    expect(status()).toMatchObject({ kind: 'error', error: 'network' });
  });

  it('opacity changes without a request and is clamped', () => {
    loader.setOpacity(TEMP, 1.7);
    expect(readLayer(store, TEMP)?.opacity).toBe(1);
    loader.setOpacity(TEMP, 0.25);
    expect(readLayer(store, TEMP)?.opacity).toBe(0.25);
    expect(api.calls).toHaveLength(0);
  });

  it('ignores a non-numeric opacity', () => {
    loader.setOpacity(TEMP, 0.5);
    loader.setOpacity(TEMP, Number.NaN);
    expect(readLayer(store, TEMP)?.opacity).toBe(0.5);
  });

  it('layers load independently', async () => {
    loader.setEnabled(TEMP, true);
    loader.setEnabled(WIND, true);
    api.last(WIND).resolve();
    await flush();
    expect(status(WIND)?.kind).toBe('success');
    expect(status(TEMP)?.kind).toBe('loading');
  });
});

describe('layerLoader: races', () => {
  it('on → off → on: only the last request wins, the first one is aborted', async () => {
    loader.setEnabled(TEMP, true);
    const first = api.last();
    loader.setEnabled(TEMP, false);
    loader.setEnabled(TEMP, true);
    const second = api.last();

    expect(first.signal.aborted).toBe(true);
    expect(second.signal.aborted).toBe(false);

    second.resolve();
    await flush();
    expect(status()).toEqual({ kind: 'success', requestId: 2 });
  });

  it('a late response of a superseded request is ignored even if the API ignores abort', async () => {
    setup({ respectAbort: false });
    loader.setEnabled(TEMP, true);
    api.last().reject(new LayerApiError('network'));
    await flush();
    loader.retry(TEMP); // request 2
    const second = api.last();
    loader.setEnabled(TEMP, false);
    loader.setEnabled(TEMP, true); // request 3
    const third = api.last();

    third.resolve();
    await flush();
    second.resolve(); // arrives after the newer one
    await flush();

    expect(status()).toEqual({ kind: 'success', requestId: 3 });
  });

  it('an old error does not overwrite a newer success', async () => {
    setup({ respectAbort: false });
    loader.setEnabled(TEMP, true);
    const first = api.last();
    loader.setEnabled(TEMP, false);
    loader.setEnabled(TEMP, true);
    api.last().resolve();
    await flush();

    first.reject(new LayerApiError('server'));
    await flush();
    expect(status()).toEqual({ kind: 'success', requestId: 2 });
  });

  it('a response that arrives after the layer was disabled is ignored', async () => {
    setup({ respectAbort: false });
    loader.setEnabled(TEMP, true);
    const call = api.last();
    loader.setEnabled(TEMP, false);
    call.resolve();
    await flush();

    expect(status()).toEqual({ kind: 'idle' });
  });

  it('cancelling is not an error', async () => {
    loader.setEnabled(TEMP, true);
    loader.setEnabled(TEMP, false);
    await flush();
    expect(status()).toEqual({ kind: 'idle' });
  });

  it('20 rapid toggles leave exactly one live request', async () => {
    for (let i = 0; i < 20; i++) loader.setEnabled(TEMP, i % 2 === 0);
    // 20 toggles end in "off" — one more to finish "on"
    loader.setEnabled(TEMP, true);
    expect(api.calls.filter((c) => !c.signal.aborted)).toHaveLength(1);
    expect(loader.pendingCount).toBe(1);
    api.last().resolve();
    await flush();
    expect(status()).toEqual({ kind: 'success', requestId: 11 });
  });
});

describe('layerLoader: timeouts and cleanup', () => {
  it('times out even when the API never answers and ignores abort', async () => {
    vi.useFakeTimers();
    setup({ respectAbort: false, timeoutMs: 1000 });
    loader.setEnabled(TEMP, true);

    await vi.advanceTimersByTimeAsync(1000);

    expect(status()).toEqual({ kind: 'error', requestId: 1, error: 'timeout' });
    expect(loader.pendingCount).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('dispose aborts every request and clears every timer', () => {
    vi.useFakeTimers();
    setup();
    loader.setEnabled(TEMP, true);
    loader.setEnabled(WIND, true);
    expect(vi.getTimerCount()).toBe(2);

    loader.dispose();

    expect(api.calls.every((c) => c.signal.aborted)).toBe(true);
    expect(loader.pendingCount).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('a successful request leaves no timers behind', async () => {
    vi.useFakeTimers();
    setup();
    loader.setEnabled(TEMP, true);
    api.last().resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(loader.pendingCount).toBe(0);
  });
});

describe('layerLoader: resume', () => {
  it('loads layers that are enabled but are neither loaded nor in flight (shared URL)', async () => {
    store.dispatch({
      layers: {
        ...store.get('layers'),
        [TEMP]: { id: TEMP, enabled: true, opacity: 1, status: { kind: 'idle' } },
      },
    });
    loader.resume();
    expect(status()).toEqual({ kind: 'loading', requestId: 1 });
    api.last().resolve();
    await flush();
    expect(status()?.kind).toBe('success');
  });

  it('restarts requests cancelled by dispose (StrictMode remount), once', () => {
    loader.setEnabled(TEMP, true);
    loader.dispose();
    loader.resume();
    loader.resume();
    expect(api.calls.filter((c) => !c.signal.aborted)).toHaveLength(1);
  });

  it('leaves errors and loaded layers alone', async () => {
    loader.setEnabled(TEMP, true);
    loader.setEnabled(WIND, true);
    api.last(TEMP).resolve();
    api.last(WIND).reject(new LayerApiError('server'));
    await flush();
    loader.resume();
    expect(api.calls).toHaveLength(2);
  });
});
