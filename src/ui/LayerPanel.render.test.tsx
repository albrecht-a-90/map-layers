import { act, render } from '@testing-library/react';
import { memo, Profiler } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AppProviders } from '../app/AppProviders';
import { defaultCatalog } from '../domain/layerCatalog';
import { toLayerId } from '../domain/layer.types';
import { patchLayer } from '../store/layerActions';
import { createInitialLayersState, useLayersStore, type LayersStore } from '../store/layersStore';
import { createControlledApi } from '../test/controlledApi';
import { LayerPanel } from './LayerPanel';

// Rows render nothing here, so any commit inside the Profiler is the panel itself.
vi.mock('./LayerRow', () => ({ LayerRow: memo(() => null) }));

describe('LayerPanel re-renders', () => {
  it('changing a layer at 150 layers does not re-render the list', () => {
    let store: LayersStore | undefined;
    function CaptureStore() {
      store = useLayersStore();
      return null;
    }
    let commits = 0;
    render(
      <AppProviders
        catalog={defaultCatalog}
        api={createControlledApi()}
        initialState={createInitialLayersState(defaultCatalog.first(150))}
      >
        <CaptureStore />
        <Profiler
          id="panel"
          onRender={() => {
            commits++;
          }}
        >
          <LayerPanel />
        </Profiler>
      </AppProviders>,
    );
    if (!store) throw new Error('store not captured');
    const captured = store;
    const before = commits;

    act(() => {
      for (let i = 0; i <= 100; i++) patchLayer(captured, toLayerId('wind-7'), { opacity: i / 100 });
    });

    expect(commits).toBe(before);
  });
});
