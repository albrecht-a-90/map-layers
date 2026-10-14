import OlMap from 'ol/Map';
import View from 'ol/View';
import { defaults as defaultControls, ScaleLine } from 'ol/control';
import TileLayer from 'ol/layer/Tile';
import 'ol/ol.css';
import { transformExtent } from 'ol/proj';
import OSM from 'ol/source/OSM';
import { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useServices } from '../app/servicesContext';
import { useT } from '../i18n/localeStore';
import { useLayersStore } from '../store/layersStore';
import { createMapSync } from './mapSync';
import { createOlLayerFactory } from './olLayers';
import { KG_BBOX } from './syntheticField';

/** OpenLayers map. Loaded lazily — the panel and the tests don't depend on `ol`. */
export default function MapView() {
  const targetRef = useRef<HTMLDivElement>(null);
  const store = useLayersStore();
  const { catalog } = useServices();
  const t = useT();

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const map = new OlMap({
      target,
      layers: [new TileLayer({ source: new OSM(), zIndex: -1 })],
      controls: defaultControls({ attributionOptions: { collapsible: true } }).extend([new ScaleLine()]),
      view: new View({ maxZoom: 12 }),
    });
    map.getView().fit(transformExtent([...KG_BBOX], 'EPSG:4326', 'EPSG:3857'), { padding: [24, 24, 24, 24] });

    const sync = createMapSync({ store, catalog, createLayer: createOlLayerFactory(map) });
    return () => {
      sync.dispose();
      map.setTarget(undefined);
      map.dispose();
    };
  }, [store, catalog]);

  return (
    <Wrapper>
      <Canvas ref={targetRef} role="img" aria-label={t('map.label')} />
      <Note>{t('map.synthetic')}</Note>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  position: absolute;
  inset: 0;
`;

const Canvas = styled.div`
  position: absolute;
  inset: 0;
`;

const Note = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgb(255 255 255 / 85%);
  color: #111827;
  font-size: 12px;
  pointer-events: none;
`;
