import Vedro from 'vedro';
import { beforeEach, describe, expect, it } from 'vitest';
import { defaultCatalog } from '../domain/layerCatalog';
import { toLayerId, type LayerDefinition, type LayerId } from '../domain/layer.types';
import { patchLayer } from '../store/layerActions';
import { createInitialLayersState, type LayersState, type LayersStore } from '../store/layersStore';
import { createMapSync, type MapLayerAdapter } from './mapSync';

const TEMP = toLayerId('temperature');
const WIND = toLayerId('wind');

interface FakeLayer extends MapLayerAdapter {
  readonly id: LayerId;
  opacity: number;
  zIndex: number;
  disposed: boolean;
}

let store: LayersStore;
let created: FakeLayer[];

const fakeFactory = (definition: LayerDefinition): MapLayerAdapter => {
  const layer: FakeLayer = {
    id: definition.id,
    opacity: 1,
    zIndex: 0,
    disposed: false,
    setOpacity(value) {
      layer.opacity = value;
    },
    setZIndex(value) {
      layer.zIndex = value;
    },
    dispose() {
      layer.disposed = true;
    },
  };
  created.push(layer);
  return layer;
};

const live = (id: LayerId) => created.filter((l) => l.id === id && !l.disposed);
const loaded = (id: LayerId, requestId = 1) => {
  patchLayer(store, id, { enabled: true, status: { kind: 'success', requestId } });
};
const startSync = () => createMapSync({ store, catalog: defaultCatalog, createLayer: fakeFactory });

beforeEach(() => {
  created = [];
  store = new Vedro<LayersState>(createInitialLayersState(defaultCatalog.first(3)));
});

describe('mapSync', () => {
  it('shows a layer only once it is enabled and loaded', () => {
    startSync();
    patchLayer(store, TEMP, { enabled: true, status: { kind: 'loading', requestId: 1 } });
    expect(live(TEMP)).toHaveLength(0);
    loaded(TEMP);
    expect(live(TEMP)).toHaveLength(1);
  });

  it('picks up layers loaded before the map mounted', () => {
    loaded(TEMP);
    startSync();
    expect(live(TEMP)).toHaveLength(1);
  });

  it('applies opacity to the same map layer', () => {
    startSync();
    loaded(TEMP);
    patchLayer(store, TEMP, { opacity: 0.3 });
    expect(created).toHaveLength(1);
    expect(live(TEMP)[0]?.opacity).toBe(0.3);
  });

  it('a reload that ends in success keeps the same map layer', () => {
    startSync();
    loaded(TEMP, 1);
    loaded(TEMP, 2);
    expect(created).toHaveLength(1);
  });

  it('removes and disposes a layer that is disabled or failed', () => {
    startSync();
    loaded(TEMP);
    loaded(WIND);
    patchLayer(store, TEMP, { enabled: false, status: { kind: 'idle' } });
    patchLayer(store, WIND, { status: { kind: 'error', requestId: 2, error: 'server' } });
    expect(live(TEMP)).toHaveLength(0);
    expect(live(WIND)).toHaveLength(0);
    expect(created.every((l) => l.disposed)).toBe(true);
  });

  it('draws the first layer in the list on top', () => {
    startSync();
    loaded(TEMP);
    loaded(WIND);
    const [temp] = live(TEMP);
    const [wind] = live(WIND);
    expect(temp?.zIndex).toBeGreaterThan(wind?.zIndex ?? Infinity);
  });

  it('dispose removes every layer and stops listening', () => {
    const sync = startSync();
    loaded(TEMP);
    sync.dispose();
    expect(created.every((l) => l.disposed)).toBe(true);

    loaded(WIND);
    expect(created).toHaveLength(1);
  });
});
