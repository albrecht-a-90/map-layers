import { describe, expect, it } from 'vitest';
import { dictionaries } from './dictionaries';
import { translate } from './localeStore';

describe('translate', () => {
  it('interpolates parameters', () => {
    expect(translate('en', 'panel.summary', { enabled: 2, loading: 1, errors: 0 })).toBe(
      'Enabled: 2 · loading: 1 · errors: 0',
    );
  });

  it('keeps unknown placeholders visible', () => {
    expect(translate('ru', 'layer.toggle')).toBe('Показать слой «{title}»');
  });

  it('every language defines the same keys', () => {
    const keys = Object.keys(dictionaries.ru).sort();
    expect(Object.keys(dictionaries.en).sort()).toEqual(keys);
    expect(Object.keys(dictionaries.ky).sort()).toEqual(keys);
  });

  it('translates to Kyrgyz', () => {
    expect(translate('ky', 'layer.retry')).toBe('Кайталоо');
  });
});
