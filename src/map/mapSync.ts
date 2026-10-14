import type { LayerCatalog } from '../domain/layerCatalog';
import type { LayerDefinition, LayerId } from '../domain/layer.types';
import type { LayersStore } from '../store/layersStore';

/**
 * What mapSync needs from a drawn layer. The OpenLayers implementation lives in
 * olLayers.ts; tests use a fake, so the sync logic runs without canvas.
 */
export interface MapLayerAdapter {
  setOpacity(opacity: number): void;
  setZIndex(zIndex: number): void;
  dispose(): void;
}

export type MapLayerFactory = (definition: LayerDefinition) => MapLayerAdapter;

/**
 * Store → map layers, outside React: dragging an opacity slider calls `setOpacity`
 * on one map layer without rendering any component. A layer is on the map while it
 * is enabled and loaded; the first layer in the list is drawn on top.
 */
export function createMapSync({
  store,
  catalog,
  createLayer,
}: {
  store: LayersStore;
  catalog: LayerCatalog;
  createLayer: MapLayerFactory;
}): { dispose(): void } {
  const mounted = new Map<LayerId, MapLayerAdapter>();

  const remove = (id: LayerId) => {
    mounted.get(id)?.dispose();
    mounted.delete(id);
  };

  const sync = () => {
    const layers = store.get('layers');
    const order = store.get('order');
    const visible = new Set<LayerId>();

    order.forEach((id, index) => {
      const layer = layers[id];
      const definition = catalog.get(id);
      if (!layer?.enabled || layer.status.kind !== 'success' || !definition) return;
      visible.add(id);

      let adapter = mounted.get(id);
      if (!adapter) {
        adapter = createLayer(definition);
        mounted.set(id, adapter);
      }
      adapter.setOpacity(layer.opacity);
      adapter.setZIndex(order.length - index);
    });

    for (const id of [...mounted.keys()]) if (!visible.has(id)) remove(id);
  };

  // vedro's `store.on` runs the callback once on subscribe, which also picks up
  // layers loaded before the map mounted
  const unsubscribers = [store.on('layers', sync), store.on('order', sync)];

  return {
    dispose() {
      unsubscribers.forEach((unsubscribe) => {
        unsubscribe();
      });
      [...mounted.keys()].forEach(remove);
    },
  };
}
