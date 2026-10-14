import styled from 'styled-components';
import { useT } from '../i18n/localeStore';
import { useLayersSelector } from '../store/layersStore';
import { LayerRow } from './LayerRow';

/** Depends on `order` only — toggling or fading a layer never re-renders the list. */
export function LayerPanel() {
  const order = useLayersSelector((s) => s.order);
  const t = useT();

  return (
    <Panel aria-labelledby="layers-title">
      <Heading id="layers-title">{t('panel.title')}</Heading>
      <LayerSummary />
      <List>
        {order.map((id) => (
          <LayerRow key={id} id={id} />
        ))}
      </List>
    </Panel>
  );
}

function LayerSummary() {
  const counts = useLayersSelector((s) => {
    let enabled = 0;
    let loading = 0;
    let errors = 0;
    for (const id of s.order) {
      const layer = s.layers[id];
      if (!layer?.enabled) continue;
      enabled++;
      if (layer.status.kind === 'loading') loading++;
      if (layer.status.kind === 'error') errors++;
    }
    return { enabled, loading, errors };
  });
  const t = useT();
  return <Summary>{t('panel.summary', counts)}</Summary>;
}

const Panel = styled.section`
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: ${({ theme }) => theme.color.bg};
`;

const Heading = styled.h2`
  margin: 0;
  padding: 14px 12px 4px;
  font-size: 16px;
`;

const Summary = styled.p`
  margin: 0;
  padding: 0 12px 10px;
  color: ${({ theme }) => theme.color.muted};
  font-size: 12px;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
`;

const List = styled.ul`
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: 0;
  overflow-y: auto;
`;
