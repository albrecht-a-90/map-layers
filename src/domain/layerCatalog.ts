import type { Locale } from '../i18n/locale';
import { toLayerId, type LayerDefinition, type LayerId, type LayerKind } from './layer.types';

type Text = Readonly<Record<Locale, string>>;

const KIND_META = {
  temperature: { unit: '°C', title: { ru: 'Температура', ky: 'Температура', en: 'Temperature' } },
  wind: { unit: 'm/s', title: { ru: 'Ветер', ky: 'Шамал', en: 'Wind' } },
  insolation: {
    unit: 'kWh/m²/day',
    title: { ru: 'Инсоляция', ky: 'Күн радиациясы', en: 'Insolation' },
  },
} as const satisfies Record<LayerKind, { unit: string; title: Text }>;

const KINDS = Object.keys(KIND_META) as LayerKind[];

/**
 * The first three ids are simply `temperature`, `wind`, `insolation`; the rest
 * repeat the kinds with a number (`temperature-2`, …) to show the list at scale.
 */
function createLayerDefinitions(count: number): LayerDefinition[] {
  return Array.from({ length: count }, (_, index) => {
    const kind = KINDS[index % KINDS.length] ?? 'temperature';
    const variant = Math.floor(index / KINDS.length);
    const meta = KIND_META[kind];
    const number = variant === 0 ? '' : ` #${variant + 1}`;
    return {
      id: toLayerId(variant === 0 ? kind : `${kind}-${variant + 1}`),
      kind,
      title: { ru: meta.title.ru + number, ky: meta.title.ky + number, en: meta.title.en + number },
      unit: meta.unit,
    };
  });
}

/**
 * All layers the app knows about. The store holds state for the first N of them
 * (`?count=N` in the URL), so changing the list size never invents new definitions.
 */
export interface LayerCatalog {
  get(id: LayerId): LayerDefinition | undefined;
  indexOf(id: LayerId): number;
  first(count: number): readonly LayerDefinition[];
}

function createLayerCatalog(definitions: readonly LayerDefinition[]): LayerCatalog {
  const byId = new Map(definitions.map((d, i) => [d.id, { definition: d, index: i }]));
  return {
    get: (id) => byId.get(id)?.definition,
    indexOf: (id) => byId.get(id)?.index ?? -1,
    first: (count) => definitions.slice(0, count),
  };
}

export const MAX_LAYER_COUNT = 150;
/** Temperature, wind, insolation — the layers from the task. */
export const DEFAULT_LAYER_COUNT = 3;

export const defaultCatalog = createLayerCatalog(createLayerDefinitions(MAX_LAYER_COUNT));
