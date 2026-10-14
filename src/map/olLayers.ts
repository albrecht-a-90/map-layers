import type OlMap from 'ol/Map';
import ImageLayer from 'ol/layer/Image';
import ImageStatic from 'ol/source/ImageStatic';
import type { MapLayerFactory } from './mapSync';
import { KG_BBOX, renderField, seedOf } from './syntheticField';

/** Creates adapters that add / remove OpenLayers layers on `map`. */
export function createOlLayerFactory(map: OlMap): MapLayerFactory {
  return (definition) => {
    const layer = new ImageLayer({
      source: new ImageStatic({
        url: renderField(definition.kind, seedOf(definition.id)),
        imageExtent: [...KG_BBOX],
        projection: 'EPSG:4326', // reprojected to Web Mercator by OpenLayers
        interpolate: true,
      }),
    });
    map.addLayer(layer);
    return {
      setOpacity: (opacity) => {
        layer.setOpacity(opacity);
      },
      setZIndex: (zIndex) => {
        layer.setZIndex(zIndex);
      },
      dispose: () => {
        map.removeLayer(layer);
        layer.dispose();
      },
    };
  };
}
