import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import type { FeatureCollection, Feature, Geometry, Position } from 'geojson';
import worldData from 'world-atlas/countries-110m.json';

const topology = worldData as Topology;
const countriesFC = feature(
  topology,
  topology.objects.countries,
) as FeatureCollection;

function pointInRing(point: [number, number], ring: Position[]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInGeometry(point: [number, number], geom: Geometry): boolean {
  if (geom.type === 'Polygon') {
    if (!pointInRing(point, geom.coordinates[0])) return false;
    for (let i = 1; i < geom.coordinates.length; i++) {
      if (pointInRing(point, geom.coordinates[i])) return false;
    }
    return true;
  }
  if (geom.type === 'MultiPolygon') {
    for (const polygon of geom.coordinates) {
      if (pointInRing(point, polygon[0])) {
        let inHole = false;
        for (let i = 1; i < polygon.length; i++) {
          if (pointInRing(point, polygon[i])) {
            inHole = true;
            break;
          }
        }
        if (!inHole) return true;
      }
    }
  }
  return false;
}

/**
 * Given visited [lng, lat] locations, return a GeoJSON FeatureCollection
 * of country polygons that contain at least one visited point.
 */
export function getVisitedCountriesGeoJSON(
  locations: [number, number][],
): FeatureCollection {
  const visited: Feature[] = [];
  for (const f of countriesFC.features) {
    if (locations.some(loc => pointInGeometry(loc, f.geometry))) {
      visited.push({ ...f, properties: { ...f.properties, visited: true } });
    }
  }
  return { type: 'FeatureCollection', features: visited };
}
