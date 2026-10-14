import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { AppProviders } from '../app/AppProviders';
import { defaultCatalog } from '../domain/layerCatalog';
import { createInitialLayersState, useLayersStore, type LayersStore } from '../store/layersStore';
import { createControlledApi } from '../test/controlledApi';
import { LayerPanel } from './LayerPanel';

/**
 * vedro does not expose a subscriber count; reading the private notifier is the
 * only way to assert that unmounted components unsubscribed. Test-only.
 */
const subscriberCount = (store: LayersStore) =>
  (store as unknown as { notifier: { stateSubscriptions: unknown[] } }).notifier.stateSubscriptions.length;

const THREE_LAYERS = createInitialLayersState(defaultCatalog.first(3));

describe('LayerPanel memory', () => {
  it('100 mount/unmount cycles leave no store subscriptions behind', () => {
    let store: LayersStore | undefined;
    function CaptureStore() {
      store = useLayersStore();
      return null;
    }
    function Harness() {
      const [shown, setShown] = useState(false);
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setShown((v) => !v);
            }}
          >
            toggle-panel
          </button>
          {shown && <LayerPanel />}
        </>
      );
    }

    render(
      <AppProviders catalog={defaultCatalog} api={createControlledApi()} initialState={THREE_LAYERS}>
        <CaptureStore />
        <Harness />
      </AppProviders>,
    );
    if (!store) throw new Error('store not captured');
    const baseline = subscriberCount(store);
    const toggle = screen.getByText('toggle-panel');

    fireEvent.click(toggle);
    expect(subscriberCount(store)).toBeGreaterThan(baseline);

    for (let i = 0; i < 199; i++) fireEvent.click(toggle); // ends unmounted
    expect(screen.queryByRole('region')).toBeNull();
    expect(subscriberCount(store)).toBe(baseline);
  });

  it('unmounting the app aborts requests in flight', () => {
    const api = createControlledApi();
    const { unmount } = render(
      <AppProviders catalog={defaultCatalog} api={api} initialState={THREE_LAYERS}>
        <LayerPanel />
      </AppProviders>,
    );
    for (const checkbox of screen.getAllByRole('checkbox')) fireEvent.click(checkbox);
    expect(api.calls).toHaveLength(3);

    unmount();

    expect(api.calls.every((c) => c.signal.aborted)).toBe(true);
  });

  it('summary counts enabled layers', () => {
    render(
      <AppProviders catalog={defaultCatalog} api={createControlledApi()} initialState={THREE_LAYERS}>
        <LayerPanel />
      </AppProviders>,
    );
    const [first] = screen.getAllByRole('checkbox');
    if (!first) throw new Error('no rows');
    fireEvent.click(first);
    expect(within(screen.getByRole('region')).getByText(/(Включено|Enabled): 1/)).toBeInTheDocument();
  });
});
