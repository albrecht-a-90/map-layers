import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppProviders } from '../app/AppProviders';
import { defaultCatalog } from '../domain/layerCatalog';
import { useDocumentLang } from '../i18n/localeStore';
import { createInitialLayersState } from '../store/layersStore';
import { createControlledApi } from '../test/controlledApi';
import { LanguageSwitch } from './LanguageSwitch';

function Header() {
  useDocumentLang();
  return <LanguageSwitch />;
}

describe('LanguageSwitch', () => {
  it('keeps <html lang> in sync with the chosen language', () => {
    render(
      <AppProviders
        catalog={defaultCatalog}
        api={createControlledApi()}
        initialState={createInitialLayersState(defaultCatalog.first(1))}
      >
        <Header />
      </AppProviders>,
    );

    for (const locale of ['ky', 'en', 'ru']) {
      fireEvent.click(screen.getByRole('button', { name: locale.toUpperCase() }));
      expect(document.documentElement.lang).toBe(locale);
    }
  });
});
