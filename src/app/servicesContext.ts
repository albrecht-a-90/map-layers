import { createContext, use } from 'react';
import type { LayerCatalog } from '../domain/layerCatalog';
import type { LayerLoader } from '../services/layerLoader';

export interface AppServices {
  readonly catalog: LayerCatalog;
  readonly loader: LayerLoader;
}

export const ServicesContext = createContext<AppServices | null>(null);

/** Stable for the app's lifetime — safe to use inside memoised components. */
export function useServices(): AppServices {
  const services = use(ServicesContext);
  if (!services) throw new Error('useServices must be used inside <AppServicesProvider>');
  return services;
}
