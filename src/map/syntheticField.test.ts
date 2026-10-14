import { describe, expect, it } from 'vitest';
import type { LayerKind } from '../domain/layer.types';
import { colorFor } from './palettes';
import { edgeAlpha, fieldValue, seedOf } from './syntheticField';

const KINDS: LayerKind[] = ['temperature', 'wind', 'insolation'];
const GRID = Array.from({ length: 21 }, (_, i) => i / 20);

describe('syntheticField', () => {
  it('stays on 0..1 everywhere', () => {
    for (const kind of KINDS) {
      for (const u of GRID) {
        for (const v of GRID) {
          const value = fieldValue(kind, u, v, 0.37);
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('is deterministic, and numbered layers differ from the base one', () => {
    expect(seedOf('temperature')).toBe(seedOf('temperature'));
    expect(seedOf('temperature-2')).not.toBe(seedOf('temperature'));
    const a = fieldValue('temperature', 0.3, 0.6, seedOf('temperature'));
    const b = fieldValue('temperature', 0.3, 0.6, seedOf('temperature-2'));
    expect(a).not.toBe(b);
  });

  it('follows the trend of its kind', () => {
    const meanAt = (kind: LayerKind, point: (t: number) => readonly [number, number]) =>
      GRID.reduce((sum, t) => sum + fieldValue(kind, ...point(t), 0), 0) / GRID.length;
    const west = (t: number) => [0.1, t] as const;
    const east = (t: number) => [0.9, t] as const;
    const south = (t: number) => [t, 0.1] as const;
    const north = (t: number) => [t, 0.9] as const;

    expect(meanAt('temperature', west)).toBeGreaterThan(meanAt('temperature', east));
    expect(meanAt('wind', east)).toBeGreaterThan(meanAt('wind', west));
    expect(meanAt('insolation', south)).toBeGreaterThan(meanAt('insolation', north));
  });

  it('fades out at the border of the box', () => {
    expect(edgeAlpha(0, 0.5)).toBe(0);
    expect(edgeAlpha(0.5, 0.5)).toBe(1);
    expect(edgeAlpha(0.03, 0.5)).toBeCloseTo(0.5);
  });

  it('maps the ends of the scale to the ends of the palette and clamps', () => {
    expect(colorFor('temperature', 0)).toEqual([49, 54, 149]);
    expect(colorFor('temperature', 1)).toEqual([165, 0, 38]);
    expect(colorFor('temperature', 2)).toEqual(colorFor('temperature', 1));
  });
});
