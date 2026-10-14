import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { Profiler, type ProfilerOnRenderCallback } from 'react';
import { describe, expect, it } from 'vitest';
import { AppProviders } from '../app/AppProviders';
import { defaultCatalog } from '../domain/layerCatalog';
import { toLayerId, type LayerId } from '../domain/layer.types';
import { createInitialLayersState } from '../store/layersStore';
import { createControlledApi, flush } from '../test/controlledApi';
import { LayerRow } from './LayerRow';

const ROW_COUNT = 150;
const IDS = defaultCatalog.first(ROW_COUNT).map((d) => d.id);
const TEMP = toLayerId('temperature');

function renderRows() {
  const renders = new Map<string, number>();
  const onRender: ProfilerOnRenderCallback = (id) => {
    renders.set(id, (renders.get(id) ?? 0) + 1);
  };
  const api = createControlledApi();
  render(
    <AppProviders
      catalog={defaultCatalog}
      api={api}
      initialState={createInitialLayersState(defaultCatalog.first(ROW_COUNT))}
    >
      <ul>
        {IDS.map((id) => (
          <Profiler key={id} id={id} onRender={onRender}>
            <LayerRow id={id} />
          </Profiler>
        ))}
      </ul>
    </AppProviders>,
  );
  const snapshot = () => new Map(renders);
  const changedRows = (before: Map<string, number>) =>
    IDS.filter((id) => (renders.get(id) ?? 0) !== (before.get(id) ?? 0));
  return { api, snapshot, changedRows };
}

const row = (id: LayerId) => screen.getByTestId(`layer-row-${id}`);

describe('LayerRow re-renders', () => {
  it('changing one layer opacity re-renders only that row', () => {
    const { snapshot, changedRows } = renderRows();
    const before = snapshot();

    const slider = within(row(TEMP)).getByRole('slider');
    for (const value of [90, 80, 70, 60, 50]) fireEvent.change(slider, { target: { value } });

    expect(changedRows(before)).toEqual([TEMP]);
  });

  it('a full load cycle of one layer re-renders only that row', async () => {
    const { api, snapshot, changedRows } = renderRows();
    const before = snapshot();

    fireEvent.click(within(row(TEMP)).getByRole('checkbox'));
    await act(async () => {
      api.last().resolve();
      await flush();
    });

    expect(within(row(TEMP)).getByText(/^(Загружен|Loaded)$/)).toBeInTheDocument();
    expect(changedRows(before)).toEqual([TEMP]);
  });

  it('shows retry only on error, and retry reloads', async () => {
    const { api } = renderRows();
    fireEvent.click(within(row(TEMP)).getByRole('checkbox'));
    expect(within(row(TEMP)).queryByRole('button')).toBeNull();

    await act(async () => {
      api.last().reject(new Error('boom'));
      await flush();
    });
    fireEvent.click(within(row(TEMP)).getByRole('button'));

    expect(api.calls).toHaveLength(2);
    expect(within(row(TEMP)).queryByRole('button')).toBeNull();
  });
});
