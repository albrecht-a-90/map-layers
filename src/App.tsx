import { lazy, Suspense } from 'react';
import styled from 'styled-components';
import { useDocumentLang, useT } from './i18n/localeStore';
import { LanguageSwitch } from './ui/LanguageSwitch';
import { LayerPanel } from './ui/LayerPanel';

// OpenLayers is most of the bundle — loaded only when the map mounts.
const MapView = lazy(() => import('./map/MapView'));

export function App() {
  const t = useT();
  useDocumentLang();
  return (
    <Layout>
      <Header>
        <AppTitle>{t('app.title')}</AppTitle>
        <LanguageSwitch />
      </Header>
      <LayerPanel />
      <MapArea>
        <Suspense fallback={<Placeholder>{t('map.loading')}</Placeholder>}>
          <MapView />
        </Suspense>
      </MapArea>
    </Layout>
  );
}

const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(280px, 380px) 1fr;
  grid-template-rows: auto minmax(0, 1fr);
  height: 100dvh;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr) minmax(0, 1.2fr);
  }
`;

const Header = styled.header`
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  background: ${({ theme }) => theme.color.surface};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
`;

const AppTitle = styled.h1`
  margin: 0;
  font-size: 18px;
`;

const MapArea = styled.main`
  position: relative;
  min-width: 0;
  min-height: 0;
  border-left: 1px solid ${({ theme }) => theme.color.border};

  @media (max-width: 720px) {
    border-left: 0;
    border-top: 1px solid ${({ theme }) => theme.color.border};
  }
`;

const Placeholder = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: ${({ theme }) => theme.color.muted};
`;
