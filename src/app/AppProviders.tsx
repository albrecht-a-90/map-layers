import { useState, type ReactNode } from 'react';
import { ThemeProvider } from 'styled-components';
import type { LayerApi } from '../api/layerApi';
import { createMockLayerApi } from '../api/mockLayerApi';
import { DEFAULT_LAYER_COUNT, defaultCatalog, type LayerCatalog } from '../domain/layerCatalog';
import { LocaleProvider } from '../i18n/localeStore';
import { LayersStoreProvider, type LayersState } from '../store/layersStore';
import { initialStateFromUrl } from '../store/urlSync';
import { GlobalStyle, theme } from '../ui/theme';
import { AppServicesProvider } from './AppServicesProvider';

interface Props {
  children: ReactNode;
  catalog?: LayerCatalog;
  /** Injected in tests to control timing and failures. */
  api?: LayerApi;
  initialState?: LayersState;
}

export function AppProviders({ children, catalog = defaultCatalog, api, initialState }: Props) {
  const [layerApi] = useState(() => api ?? createMockLayerApi(catalog));
  const [state] = useState(
    () => initialState ?? initialStateFromUrl(window.location.search, catalog, DEFAULT_LAYER_COUNT),
  );
  return (
    <LocaleProvider>
      <LayersStoreProvider state={state}>
        <ThemeProvider theme={theme}>
          <GlobalStyle />
          <AppServicesProvider catalog={catalog} api={layerApi}>
            {children}
          </AppServicesProvider>
        </ThemeProvider>
      </LayersStoreProvider>
    </LocaleProvider>
  );
}
