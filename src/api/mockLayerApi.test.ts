import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultCatalog } from '../domain/layerCatalog';
import { toLayerId } from '../domain/layer.types';
import { LayerApiError } from './layerApi';
import { createMockLayerApi } from './mockLayerApi';

const TEMP = toLayerId('temperature');

afterEach(() => {
  vi.useRealTimers();
});

describe('mockLayerApi', () => {
  it('resolves with layer data after the latency', async () => {
    vi.useFakeTimers();
    const api = createMockLayerApi(defaultCatalog, { latency: [100, 100], failRate: 0 });
    const promise = api.fetchLayer(TEMP, { signal: new AbortController().signal });
    await vi.advanceTimersByTimeAsync(100);
    await expect(promise).resolves.toEqual({ tileUrl: '/tiles/temperature/{z}/{x}/{y}.png' });
  });

  it('fails with LayerApiError at failRate 1', async () => {
    vi.useFakeTimers();
    const api = createMockLayerApi(defaultCatalog, { latency: [10, 10], failRate: 1 });
    const promise = api.fetchLayer(TEMP, { signal: new AbortController().signal });
    const assertion = expect(promise).rejects.toBeInstanceOf(LayerApiError);
    await vi.advanceTimersByTimeAsync(10);
    await assertion;
  });

  it('rejects with AbortError and clears its timer when aborted', async () => {
    vi.useFakeTimers();
    const api = createMockLayerApi(defaultCatalog, { latency: [1000, 1000], failRate: 0 });
    const controller = new AbortController();
    const promise = api.fetchLayer(TEMP, { signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(vi.getTimerCount()).toBe(0);
  });
});
