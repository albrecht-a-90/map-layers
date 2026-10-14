import type { Locale } from '../i18n/locale';

/** Branded id: a plain string can't be passed where a layer id is expected. */
export type LayerId = string & { readonly __brand: 'LayerId' };

export const toLayerId = (value: string): LayerId => value as LayerId;

export type LayerKind = 'temperature' | 'wind' | 'insolation';

export type LayerErrorCode = 'network' | 'server' | 'timeout';

export type LayerStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading'; readonly requestId: number }
  | { readonly kind: 'success'; readonly requestId: number }
  | { readonly kind: 'error'; readonly requestId: number; readonly error: LayerErrorCode };

/** Mutable, per-session state of a layer. Lives in the vedro store. */
export interface LayerState {
  readonly id: LayerId;
  readonly enabled: boolean;
  /** 0..1 */
  readonly opacity: number;
  readonly status: LayerStatus;
}

/** Static description of a layer. Never changes, so it stays out of the store. */
export interface LayerDefinition {
  readonly id: LayerId;
  /** Picks the palette and the synthetic field on the map. */
  readonly kind: LayerKind;
  readonly title: Readonly<Record<Locale, string>>;
  readonly unit: string;
}
