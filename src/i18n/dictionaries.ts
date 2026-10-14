import type { Locale } from './locale';

const ru = {
  'app.title': 'Слои карты',
  'panel.title': 'Слои',
  'panel.summary': 'Включено: {enabled} · загружается: {loading} · ошибок: {errors}',
  'layer.opacity': 'Прозрачность',
  'layer.retry': 'Повторить',
  'layer.toggle': 'Показать слой «{title}»',
  'status.idle': 'Выключен',
  'status.loading': 'Загрузка…',
  'status.success': 'Загружен',
  'status.error': 'Ошибка',
  'error.network': 'Нет связи с сервером',
  'error.server': 'Ошибка сервера',
  'error.timeout': 'Превышено время ожидания',
  'language.label': 'Язык',
  'map.label': 'Карта Кыргызстана',
  'map.loading': 'Загрузка карты…',
  'map.synthetic': 'Данные синтетические, для демонстрации',
} as const;

export type MessageKey = keyof typeof ru;

/** Kyrgyz. Machine-assisted — worth a review by a native speaker. */
const ky = {
  'app.title': 'Карта катмарлары',
  'panel.title': 'Катмарлар',
  'panel.summary': 'Күйгүзүлгөн: {enabled} · жүктөлүүдө: {loading} · ката: {errors}',
  'layer.opacity': 'Тунуктук',
  'layer.retry': 'Кайталоо',
  'layer.toggle': '«{title}» катмарын көрсөтүү',
  'status.idle': 'Өчүк',
  'status.loading': 'Жүктөлүүдө…',
  'status.success': 'Жүктөлдү',
  'status.error': 'Ката',
  'error.network': 'Сервер менен байланыш жок',
  'error.server': 'Сервердин катасы',
  'error.timeout': 'Күтүү убактысы бүттү',
  'language.label': 'Тил',
  'map.label': 'Кыргызстандын картасы',
  'map.loading': 'Карта жүктөлүүдө…',
  'map.synthetic': 'Маалыматтар синтетикалык, көрсөтүү үчүн',
} as const satisfies Record<MessageKey, string>;

const en = {
  'app.title': 'Map layers',
  'panel.title': 'Layers',
  'panel.summary': 'Enabled: {enabled} · loading: {loading} · errors: {errors}',
  'layer.opacity': 'Opacity',
  'layer.retry': 'Retry',
  'layer.toggle': 'Show layer “{title}”',
  'status.idle': 'Off',
  'status.loading': 'Loading…',
  'status.success': 'Loaded',
  'status.error': 'Error',
  'error.network': 'Network error',
  'error.server': 'Server error',
  'error.timeout': 'Request timed out',
  'language.label': 'Language',
  'map.label': 'Map of Kyrgyzstan',
  'map.loading': 'Loading map…',
  'map.synthetic': 'Synthetic data, for demonstration only',
} as const satisfies Record<MessageKey, string>;

export const dictionaries: Readonly<Record<Locale, Readonly<Record<MessageKey, string>>>> = { ru, ky, en };
