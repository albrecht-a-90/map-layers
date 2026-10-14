import Vedro from 'vedro';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultCatalog } from '../domain/layerCatalog';
import { toLayerId } from '../domain/layer.types';
import { patchLayer } from './layerActions';
import { createInitialLayersState, type LayersState } from './layersStore';
import { createUrlSync, initialStateFromUrl, parseUrlState, serializeUrlState } from './urlSync';

const TEMP = toLayerId('temperature');
const WIND = toLayerId('wind');

afterEach(() => {
  vi.useRealTimers();
});

describe('parseUrlState', () => {
  it('reads layers with optional opacity and the list size', () => {
    expect(parseUrlState('?layers=temperature:60,wind&count=20', defaultCatalog)).toEqual({
      layers: [
        { id: TEMP, opacity: 0.6 },
        { id: WIND, opacity: 1 },
      ],
      count: 20,
    });
  });

  it('drops unknown ids, duplicates and bad values instead of throwing', () => {
    const state = parseUrlState(
      '?layers=nope,temperature:abc,temperature:10,wind:250&count=999',
      defaultCatalog,
    );
    expect(state).toEqual({
      layers: [
        { id: TEMP, opacity: 1 },
        { id: WIND, opacity: 1 },
      ],
      count: undefined,
    });
  });

  it('treats an empty opacity as malformed, not 0 %', () => {
    expect(parseUrlState('?layers=wind:,temperature: ', defaultCatalog).layers).toEqual([
      { id: WIND, opacity: 1 },
      { id: TEMP, opacity: 1 },
    ]);
  });
});

describe('serializeUrlState', () => {
  it('writes enabled layers in list order and keeps unrelated params', () => {
    let state: LayersState = createInitialLayersState(defaultCatalog.first(3));
    state = {
      ...state,
      layers: {
        ...state.layers,
        [WIND]: { id: WIND, enabled: true, opacity: 0.35, status: { kind: 'idle' } },
        [TEMP]: { id: TEMP, enabled: true, opacity: 1, status: { kind: 'idle' } },
      },
    };
    expect(serializeUrlState(state, '?count=3')).toBe('?count=3&layers=temperature,wind:35');
  });

  it('round-trips', () => {
    const initial = initialStateFromUrl('?layers=wind:40', defaultCatalog, 3);
    expect(parseUrlState(serializeUrlState(initial), defaultCatalog)).toEqual(
      parseUrlState('?layers=wind:40', defaultCatalog),
    );
  });
});

describe('initialStateFromUrl', () => {
  it('marks URL layers enabled (still idle — the loader resumes them)', () => {
    const state = initialStateFromUrl('?layers=wind:40', defaultCatalog, 3);
    expect(state.layers[WIND]).toEqual({ id: WIND, enabled: true, opacity: 0.4, status: { kind: 'idle' } });
    expect(state.order).toHaveLength(3);
  });

  it('takes the list size from count', () => {
    expect(initialStateFromUrl('?count=150', defaultCatalog, 3).order).toHaveLength(150);
  });

  it('grows the list to contain a linked layer', () => {
    const state = initialStateFromUrl('?layers=wind-10', defaultCatalog, 3);
    expect(state.order).toHaveLength(defaultCatalog.indexOf(toLayerId('wind-10')) + 1);
    expect(state.layers[toLayerId('wind-10')]?.enabled).toBe(true);
  });
});

describe('createUrlSync', () => {
  it('writes at most once per interval while a slider moves', async () => {
    vi.useFakeTimers();
    const store = new Vedro<LayersState>(createInitialLayersState(defaultCatalog.first(3)));
    let search = '';
    const write = vi.fn((next: string) => {
      search = next;
    });
    const sync = createUrlSync(store, { read: () => search, write, delayMs: 300 });

    patchLayer(store, TEMP, { enabled: true });
    for (let i = 0; i < 50; i++) patchLayer(store, TEMP, { opacity: i / 100 });
    await vi.advanceTimersByTimeAsync(300);

    expect(write).toHaveBeenCalledTimes(1);
    expect(search).toBe('?layers=temperature:49');

    sync.dispose();
    patchLayer(store, TEMP, { opacity: 1 });
    await vi.advanceTimersByTimeAsync(1000);
    expect(write).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('normalises a malformed shared URL on start', async () => {
    vi.useFakeTimers();
    const initial = '?layers=nope,wind:40,wind:90';
    const store = new Vedro<LayersState>(initialStateFromUrl(initial, defaultCatalog, 3));
    let search = initial;
    const sync = createUrlSync(store, {
      read: () => search,
      write: (next) => {
        search = next;
      },
      delayMs: 300,
    });

    await vi.advanceTimersByTimeAsync(300);

    expect(search).toBe('?layers=wind:40');
    sync.dispose();
  });
});
