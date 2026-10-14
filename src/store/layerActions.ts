import type { LayerId, LayerState } from '../domain/layer.types';
import type { LayersStore } from './layersStore';

export type LayerPatch = Partial<Omit<LayerState, 'id'>>;

export const readLayer = (store: LayersStore, id: LayerId): LayerState | undefined => store.get('layers')[id];

/**
 * Every vedro dispatch wakes every subscriber, even when nothing changed,
 * so callers decide *before* dispatching whether an update is needed.
 */
export function patchLayer(store: LayersStore, id: LayerId, patch: LayerPatch): void {
  const layers = store.get('layers');
  const current = layers[id];
  if (!current) return;
  store.dispatch({ layers: { ...layers, [id]: { ...current, ...patch } } });
}
