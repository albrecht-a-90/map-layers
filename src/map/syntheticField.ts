import { assertNever } from '../domain/assertNever';
import type { LayerKind } from '../domain/layer.types';
import { colorFor } from './palettes';

/** Kyrgyzstan, `[west, south, east, north]` in degrees. */
export const KG_BBOX = [69.2, 39.1, 80.3, 43.3] as const;

/** Deterministic 0..1 from a layer id (FNV-1a), so `temperature-2` differs from `temperature`. */
export function seedOf(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 2 ** 32;
}

/**
 * A made-up field on 0..1 at `(u, v)`: u goes west → east, v south → north.
 * Smooth waves plus a trend per kind, just enough to look like a map layer. Not real data.
 */
export function fieldValue(kind: LayerKind, u: number, v: number, seed: number): number {
  const phase = seed * 2 * Math.PI;
  const waves =
    0.5 +
    0.25 * Math.sin(u * 7 + phase) * Math.cos(v * 5 - phase) +
    0.15 * Math.sin((u + v) * 11 + 2 * phase);
  let trend: number;
  switch (kind) {
    case 'temperature':
      trend = 1 - 0.7 * u; // colder towards the eastern ranges
      break;
    case 'wind':
      trend = 0.3 + 0.6 * u;
      break;
    case 'insolation':
      trend = 0.3 + 0.6 * (1 - v); // more sun in the south
      break;
    default:
      return assertNever(kind);
  }
  return Math.min(1, Math.max(0, (waves + trend) / 2));
}

const EDGE = 0.06;

/** 1 inside, fading to 0 within `EDGE` of the box border — softer than a hard rectangle. */
export function edgeAlpha(u: number, v: number): number {
  const distance = Math.min(u, 1 - u, v, 1 - v);
  return Math.min(1, Math.max(0, distance / EDGE));
}

/** Field → small RGBA image (data URL). The map stretches it with smoothing. */
export function renderField(kind: LayerKind, seed: number, width = 110, height = 42): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  const image = ctx.createImageData(width, height);
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const u = (col + 0.5) / width;
      const v = 1 - (row + 0.5) / height;
      const [r, g, b] = colorFor(kind, fieldValue(kind, u, v, seed));
      image.data.set([r, g, b, Math.round(200 * edgeAlpha(u, v))], (row * width + col) * 4);
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL();
}
