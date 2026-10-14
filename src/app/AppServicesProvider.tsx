import { useEffect, useState, type ReactNode } from 'react';
import type { LayerApi } from '../api/layerApi';
import type { LayerCatalog } from '../domain/layerCatalog';
import { createLayerLoader } from '../services/layerLoader';
import { useLayersStore } from '../store/layersStore';
import { createUrlSync } from '../store/urlSync';
import { ServicesContext, type AppServices } from './servicesContext';

interface Props {
  catalog: LayerCatalog;
  api: LayerApi;
  children: ReactNode;
}

/** Wires services to the store instance created by the surrounding vedro Provider. */
export function AppServicesProvider({ catalog, api, children }: Props) {
  const store = useLayersStore();
  const [services] = useState<AppServices>(() => ({
    catalog,
    loader: createLayerLoader({ store, api }),
  }));

  useEffect(() => {
    // layers enabled by a shared URL — and anything StrictMode's remount cancelled
    services.loader.resume();
    const urlSync = createUrlSync(store, {
      read: () => window.location.search,
      write: (search) => {
        const { pathname, hash } = window.location;
        window.history.replaceState(window.history.state, '', `${pathname}${search}${hash}`);
      },
    });
    return () => {
      urlSync.dispose();
      services.loader.dispose();
    };
  }, [services, store]);

  return <ServicesContext value={services}>{children}</ServicesContext>;
}
