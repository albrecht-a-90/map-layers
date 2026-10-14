import type { LayerKind } from '../domain/layer.types';

export type Rgb = readonly [number, number, number];

/** Colour stops on 0..1. Sequential / diverging ramps in the ColorBrewer / magma family. */
const PALETTES: Readonly<Record<LayerKind, readonly Rgb[]>> = {
  temperature: [
    [49, 54, 149],
    [69, 117, 180],
    [171, 217, 233],
    [255, 255, 191],
    [253, 174, 97],
    [215, 48, 39],
    [165, 0, 38],
  ],
  wind: [
    [237, 248, 251],
    [179, 205, 227],
    [140, 150, 198],
    [136, 86, 167],
    [129, 15, 124],
  ],
  insolation: [
    [44, 17, 95],
    [114, 31, 129],
    [183, 55, 121],
    [241, 96, 93],
    [254, 176, 120],
    [252, 253, 191],
  ],
};

/** Colour for `t` on 0..1; values outside are clamped. */
export function colorFor(kind: LayerKind, t: number): Rgb {
  const stops = PALETTES[kind];
  const position = Math.min(1, Math.max(0, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(position));
  const f = position - i;
  const a = stops[i] ?? stops[0] ?? [0, 0, 0];
  const b = stops[i + 1] ?? a;
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}
