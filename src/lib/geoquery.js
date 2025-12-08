/**
 * Lightweight geo query library for Grätzlmap
 * Uses Turf.js for spatial operations on GeoJSON data
 */

import * as turf from '@turf/turf';

/**
 * Load and cache data
 */
let geoDataCache = null;
let graetzlDataCache = null;

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

export async function loadGraetzlData() {
  if (graetzlDataCache) {
    return graetzlDataCache;
  }

  const response = await fetch('/data/graetzl_wien2025.json');
  if (!response.ok) {
    throw new Error('Failed to load graetzl data');
  }

  graetzlDataCache = await response.json();
  return graetzlDataCache;
}

/**
 * Get all Grätzl (neighborhood) features from graetzl data
 */
export function getGraetzlFeatures(graetzlData) {
  return graetzlData.features || [];
}

/**
 * Get all POI features
 */
export function getPOIFeatures(geoData) {
  return geoData.features;
}

/**
 * Get a specific Grätzl by ID
 */
export function getGraetzl(graetzlData, graetzlId) {
  return graetzlData.features.find(
    f => f.properties.Graetzl_ID === graetzlId
  );
}

/**
 * Get a specific Grätzl by name
 */
export function getGraetzlByName(graetzlData, name) {
  return graetzlData.features.find(
    f => f.properties.Graetzl_Name === name
  );
}

/**
 * Get all POIs for a specific Grätzl
 */
export function getPOIsByGraetzl(geoData, graetzlId) {
  return geoData.features.filter(
    f.properties.graetzlId === graetzlId
  );
}

/**
 * Get POIs by category
 */
export function getPOIsByCategory(geoData, category) {
  return geoData.features.filter(
    f.properties.category === category
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
export function findGraetzlAtPoint(graetzlData, point) {
  const pt = turf.point(point);
  const graetzls = getGraetzlFeatures(graetzlData);

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
export function getPOIsInGraetzl(geoData, graetzlData, graetzlId) {
  const graetzl = getGraetzl(graetzlData, graetzlId);
  if (!graetzl) return [];

  const pois = getPOIFeatures(geoData);
  return pois.filter(poi => turf.booleanPointInPolygon(poi, graetzl));
}

/**
 * Filter POIs by Grätzl and/or categories (with spatial query)
 */
export function filterPOIsWithGraetzl(geoData, graetzlData, filters = {}) {
  let pois = getPOIFeatures(geoData);

  // Filter by Grätzl using spatial query
  if (filters.graetzlId) {
    const graetzl = getGraetzl(graetzlData, filters.graetzlId);
    if (graetzl) {
      pois = pois.filter(poi => turf.booleanPointInPolygon(poi, graetzl));
    }
  }

  // Filter by categories
  if (filters.categories && filters.categories.length > 0) {
    pois = pois.filter(poi => filters.categories.includes(poi.properties.category));
  }

  return pois;
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
  loadGraetzlData,
  getGraetzlFeatures,
  getPOIFeatures,
  getGraetzl,
  getGraetzlByName,
  getPOIsByGraetzl,
  getPOIsByCategory,
  filterPOIs,
  filterPOIsWithGraetzl,
  findGraetzlAtPoint,
  getPOIsInGraetzl,
  getPOIsNearPoint,
  getAllCategories,
  featureToLeafletCoords,
  leafletCoordsToGeoJSON,
  searchPOIs
};
