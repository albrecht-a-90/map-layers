import type { LayerId } from '../domain/layer.types';

/**
 * What a real backend would return for a layer. The demo map doesn't fetch these
 * tiles — it draws a synthetic field instead (map/syntheticField.ts).
 */
export interface LayerData {
  /** XYZ tile URL template. */
  readonly tileUrl: string;
}

export interface LayerRequest {
  readonly signal: AbortSignal;
}

export interface LayerApi {
  fetchLayer(id: LayerId, request: LayerRequest): Promise<LayerData>;
}

export type LayerApiErrorCode = 'network' | 'server';

export class LayerApiError extends Error {
  readonly code: LayerApiErrorCode;

  constructor(code: LayerApiErrorCode, message = `Layer request failed: ${code}`) {
    super(message);
    this.name = 'LayerApiError';
    this.code = code;
  }
}
