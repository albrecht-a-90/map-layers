import styled from 'styled-components';
import { LOCALES } from '../i18n/locale';
import { saveLocale, useLocale, useLocaleDispatch, useT } from '../i18n/localeStore';

export function LanguageSwitch() {
  const locale = useLocale();
  const dispatch = useLocaleDispatch();
  const t = useT();

  return (
    <Group role="group" aria-label={t('language.label')}>
      {LOCALES.map((value) => (
        <Option
          key={value}
          type="button"
          aria-pressed={value === locale}
          $active={value === locale}
          onClick={() => {
            dispatch('locale', value);
            saveLocale(value);
          }}
        >
          {value.toUpperCase()}
        </Option>
      ))}
    </Group>
  );
}

const Group = styled.div`
  display: inline-flex;
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: 8px;
  overflow: hidden;
`;

const Option = styled.button<{ $active: boolean }>`
  padding: 4px 10px;
  border: 0;
  background: ${({ theme, $active }) => ($active ? theme.color.accent : 'transparent')};
  color: ${({ theme, $active }) => ($active ? theme.color.onAccent : theme.color.text)};
  font: inherit;
  font-weight: 600;
  cursor: pointer;
`;
