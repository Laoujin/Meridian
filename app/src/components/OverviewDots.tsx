import { useEffect, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { getVisitedCountriesGeoJSON } from '../utils/countries';

interface OverviewDotsProps {
  map: maplibregl.Map | null;
  locations: [number, number][];
  visible: boolean;
}

const SRC_COUNTRIES = 'overview-countries';
const LYR_COUNTRY_FILL = 'overview-countries-fill';
const LYR_COUNTRY_LINE = 'overview-countries-line';
const SRC_DOTS = 'overview-dots';
const LYR_DOTS = 'overview-dots-circle';

function removeLayers(map: maplibregl.Map) {
  try {
    for (const id of [LYR_DOTS, LYR_COUNTRY_LINE, LYR_COUNTRY_FILL]) {
      if (map.getLayer(id)) map.removeLayer(id);
    }
    for (const id of [SRC_DOTS, SRC_COUNTRIES]) {
      if (map.getSource(id)) map.removeSource(id);
    }
  } catch {
    // map may already be destroyed
  }
}

export default function OverviewDots({ map, locations, visible }: OverviewDotsProps) {
  const countriesGeoJSON = useMemo(
    () => getVisitedCountriesGeoJSON(locations),
    [locations],
  );

  const dotsGeoJSON = useMemo<FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: locations.map(([lng, lat], i) => ({
      type: 'Feature' as const,
      properties: { index: i },
      geometry: { type: 'Point' as const, coordinates: [lng, lat] },
    })),
  }), [locations]);

  useEffect(() => {
    if (!map || !visible || !locations.length) return;

    // Fit bounds tightly to visited locations only
    const bounds = new maplibregl.LngLatBounds();
    for (const [lng, lat] of locations) bounds.extend([lng, lat]);
    map.fitBounds(bounds, { padding: 40, duration: 1500 });

    // Add visited-country fill layer
    map.addSource(SRC_COUNTRIES, {
      type: 'geojson',
      data: countriesGeoJSON,
    });
    map.addLayer({
      id: LYR_COUNTRY_FILL,
      type: 'fill',
      source: SRC_COUNTRIES,
      paint: { 'fill-color': 'rgba(232, 131, 107, 0.25)' },
    });
    map.addLayer({
      id: LYR_COUNTRY_LINE,
      type: 'line',
      source: SRC_COUNTRIES,
      paint: {
        'line-color': 'rgba(232, 131, 107, 0.5)',
        'line-width': 1.5,
      },
    });

    // Add location dot markers
    map.addSource(SRC_DOTS, { type: 'geojson', data: dotsGeoJSON });
    map.addLayer({
      id: LYR_DOTS,
      type: 'circle',
      source: SRC_DOTS,
      paint: {
        'circle-radius': 5,
        'circle-color': '#e8836b',
        'circle-stroke-color': '#fff',
        'circle-stroke-width': 2,
      },
    });

    return () => removeLayers(map);
  }, [map, visible, locations, countriesGeoJSON, dotsGeoJSON]);

  return null;
}
