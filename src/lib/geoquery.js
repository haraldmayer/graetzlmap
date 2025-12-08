/**
 * Lightweight geo query library for Grätzlmap
 * Uses Turf.js for spatial operations on GeoJSON data
 */

import * as turf from '@turf/turf';

/**
 * Load and cache GeoJSON data
 */
let geoDataCache = null;

export async function loadGeoData() {
  if (geoDataCache) {
    return geoDataCache;
  }

  const response = await fetch('/data/geodata.geojson');
  if (!response.ok) {
    throw new Error('Failed to load geodata');
  }

  geoDataCache = await response.json();
  return geoDataCache;
}

/**
 * Get all Grätzl (neighborhood) features
 */
export function getGraetzlFeatures(geoData) {
  return geoData.features.filter(f => f.properties.featureType === 'graetzl');
}

/**
 * Get all POI features
 */
export function getPOIFeatures(geoData) {
  return geoData.features.filter(f => f.properties.featureType === 'poi');
}

/**
 * Get a specific Grätzl by ID
 */
export function getGraetzl(geoData, graetzlId) {
  return geoData.features.find(
    f => f.properties.featureType === 'graetzl' && f.properties.graetzlId === graetzlId
  );
}

/**
 * Get all POIs for a specific Grätzl
 */
export function getPOIsByGraetzl(geoData, graetzlId) {
  return geoData.features.filter(
    f => f.properties.featureType === 'poi' && f.properties.graetzlId === graetzlId
  );
}

/**
 * Get POIs by category
 */
export function getPOIsByCategory(geoData, category) {
  return geoData.features.filter(
    f => f.properties.featureType === 'poi' && f.properties.category === category
  );
}

/**
 * Filter POIs by multiple criteria
 * @param {Object} filters - { graetzlId?, category?, categories? }
 */
export function filterPOIs(geoData, filters = {}) {
  let pois = getPOIFeatures(geoData);

  if (filters.graetzlId) {
    pois = pois.filter(p => p.properties.graetzlId === filters.graetzlId);
  }

  if (filters.category) {
    pois = pois.filter(p => p.properties.category === filters.category);
  }

  if (filters.categories && Array.isArray(filters.categories)) {
    pois = pois.filter(p => filters.categories.includes(p.properties.category));
  }

  return pois;
}

/**
 * Find which Grätzl contains a given point
 * @param {Array} point - [longitude, latitude]
 */
export function findGraetzlAtPoint(geoData, point) {
  const pt = turf.point(point);
  const graetzls = getGraetzlFeatures(geoData);

  for (const graetzl of graetzls) {
    if (turf.booleanPointInPolygon(pt, graetzl)) {
      return graetzl;
    }
  }

  return null;
}

/**
 * Get all POIs within a specific Grätzl polygon (spatial query)
 * Uses actual point-in-polygon test
 */
export function getPOIsInGraetzl(geoData, graetzlId) {
  const graetzl = getGraetzl(geoData, graetzlId);
  if (!graetzl) return [];

  const pois = getPOIFeatures(geoData);
  return pois.filter(poi => turf.booleanPointInPolygon(poi, graetzl));
}

/**
 * Get POIs near a point within a radius
 * @param {Array} point - [longitude, latitude]
 * @param {Number} radiusKm - radius in kilometers
 */
export function getPOIsNearPoint(geoData, point, radiusKm = 0.5) {
  const center = turf.point(point);
  const pois = getPOIFeatures(geoData);

  return pois.filter(poi => {
    const distance = turf.distance(center, poi, { units: 'kilometers' });
    return distance <= radiusKm;
  });
}

/**
 * Get all unique categories from POIs
 */
export function getAllCategories(geoData) {
  const pois = getPOIFeatures(geoData);
  const categories = new Set(pois.map(p => p.properties.category));
  return Array.from(categories).sort();
}

/**
 * Convert GeoJSON feature to Leaflet-compatible format
 */
export function featureToLeafletCoords(feature) {
  if (feature.geometry.type === 'Point') {
    // Point: [lng, lat] -> [lat, lng]
    return [feature.geometry.coordinates[1], feature.geometry.coordinates[0]];
  } else if (feature.geometry.type === 'Polygon') {
    // Polygon: [[lng, lat], ...] -> [[lat, lng], ...]
    return feature.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
  }
  return null;
}

/**
 * Convert Leaflet coordinates to GeoJSON format
 */
export function leafletCoordsToGeoJSON(coords) {
  if (Array.isArray(coords) && coords.length === 2 && typeof coords[0] === 'number') {
    // Single point [lat, lng] -> [lng, lat]
    return [coords[1], coords[0]];
  } else if (Array.isArray(coords[0])) {
    // Array of coordinates [[lat, lng], ...] -> [[lng, lat], ...]
    return coords.map(c => [c[1], c[0]]);
  }
  return coords;
}

/**
 * Search POIs by text in name or description
 */
export function searchPOIs(geoData, searchText) {
  if (!searchText) return getPOIFeatures(geoData);

  const text = searchText.toLowerCase();
  return getPOIFeatures(geoData).filter(poi => {
    const name = poi.properties.name.toLowerCase();
    const desc = poi.properties.description.toLowerCase();
    return name.includes(text) || desc.includes(text);
  });
}

export default {
  loadGeoData,
  getGraetzlFeatures,
  getPOIFeatures,
  getGraetzl,
  getPOIsByGraetzl,
  getPOIsByCategory,
  filterPOIs,
  findGraetzlAtPoint,
  getPOIsInGraetzl,
  getPOIsNearPoint,
  getAllCategories,
  featureToLeafletCoords,
  leafletCoordsToGeoJSON,
  searchPOIs
};
