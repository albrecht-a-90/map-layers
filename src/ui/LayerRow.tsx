import { memo, useId } from 'react';
import styled from 'styled-components';
import { useServices } from '../app/servicesContext';
import type { LayerId } from '../domain/layer.types';
import { useLocale, useT } from '../i18n/localeStore';
import { useLayersSelector } from '../store/layersStore';
import { StatusBadge } from './StatusBadge';

interface Props {
  /** Must not change for a mounted row: vedro captures the selector once. Render with key={id}. */
  id: LayerId;
}

/**
 * Subscribes to its own layer only: changing another layer's opacity or status
 * produces an equal selector result here, so vedro skips the re-render.
 */
export const LayerRow = memo(function LayerRow({ id }: Props) {
  const layer = useLayersSelector((s) => s.layers[id]);
  const { catalog, loader } = useServices();
  const locale = useLocale();
  const t = useT();
  const opacityId = useId();
  const definition = catalog.get(id);

  if (!layer || !definition) return null;
  const title = definition.title[locale];
  const percent = Math.round(layer.opacity * 100);

  return (
    <Row data-testid={`layer-row-${id}`} $enabled={layer.enabled}>
      <Header>
        <Toggle>
          <input
            type="checkbox"
            checked={layer.enabled}
            aria-label={t('layer.toggle', { title })}
            onChange={(e) => {
              loader.setEnabled(id, e.target.checked);
            }}
          />
          <Title>{title}</Title>
          <Unit>{definition.unit}</Unit>
        </Toggle>
        <StatusBadge status={layer.status} t={t} />
      </Header>
      <Controls>
        <label htmlFor={opacityId}>{t('layer.opacity')}</label>
        <input
          id={opacityId}
          type="range"
          min={0}
          max={100}
          step={1}
          value={percent}
          aria-valuetext={`${percent}%`}
          onChange={(e) => {
            loader.setOpacity(id, Number(e.target.value) / 100);
          }}
        />
        {/* <output> is an implicit live region; the slider already announces its value */}
        <output htmlFor={opacityId} aria-hidden>
          {percent}%
        </output>
        {layer.status.kind === 'error' && (
          <RetryButton
            type="button"
            onClick={() => {
              loader.retry(id);
            }}
          >
            {t('layer.retry')}
          </RetryButton>
        )}
      </Controls>
    </Row>
  );
});

const Row = styled.li<{ $enabled: boolean }>`
  list-style: none;
  padding: 10px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme, $enabled }) => ($enabled ? theme.color.surface : 'transparent')};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const Toggle = styled.label`
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  cursor: pointer;

  input {
    align-self: center;
    margin: 0;
  }
`;

const Title = styled.span`
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Unit = styled.span`
  color: ${({ theme }) => theme.color.muted};
  font-size: 12px;
  white-space: nowrap;
`;

const Controls = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 3.2em auto;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  color: ${({ theme }) => theme.color.muted};
  font-size: 12px;

  input[type='range'] {
    width: 100%;
    min-width: 0;
    margin: 0;
  }

  output {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
`;

const RetryButton = styled.button`
  padding: 3px 10px;
  border: 1px solid ${({ theme }) => theme.color.danger};
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.color.danger};
  font: inherit;
  cursor: pointer;
`;
