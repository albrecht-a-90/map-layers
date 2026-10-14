import { createVedro } from 'vedro';
import type Vedro from 'vedro';
import { DEFAULT_LAYER_COUNT, defaultCatalog } from '../domain/layerCatalog';
import type { LayerDefinition, LayerId, LayerState } from '../domain/layer.types';

/** vedro can't add top-level keys after creation (it throws), so the full shape is declared up front. */
export interface LayersState {
  readonly layers: Readonly<Record<LayerId, LayerState>>;
  readonly order: readonly LayerId[];
}

export type LayersStore = Vedro<LayersState>;

export function createInitialLayersState(
  definitions: readonly LayerDefinition[] = defaultCatalog.first(DEFAULT_LAYER_COUNT),
): LayersState {
  const layers: Record<LayerId, LayerState> = {};
  for (const { id } of definitions) {
    layers[id] = { id, enabled: false, opacity: 1, status: { kind: 'idle' } };
  }
  return { layers, order: definitions.map((d) => d.id) };
}

export const {
  Provider: LayersStoreProvider,
  useSelector: useLayersSelector,
  useStore: useLayersStore,
} = createVedro<LayersState>(createInitialLayersState());
