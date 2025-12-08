/**
 * Utility functions for converting Grätzl names to URL-friendly slugs and vice versa
 */

/**
 * Convert a Grätzl name to a URL-friendly slug
 * Example: "Alservorstadt und Michelbeuern" -> "alservorstadt-und-michelbeuern"
 */
export function graetzlNameToSlug(name) {
  if (!name) return '';

  return name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with dashes
    .replace(/^-+|-+$/g, '');      // Remove leading/trailing dashes
}

/**
 * Find a Grätzl by its slug from graetzl data
 * Returns the Grätzl feature or null if not found
 */
export function findGraetzlBySlug(graetzlData, slug) {
  if (!slug || !graetzlData) return null;

  const graetzls = graetzlData.features || [];

  // Try to find by matching slug
  for (const graetzl of graetzls) {
    const graetzlSlug = graetzlNameToSlug(graetzl.properties.Graetzl_Name);
    if (graetzlSlug === slug) {
      return graetzl;
    }
  }

  return null;
}

/**
 * Get the current Grätzl slug from the URL path
 * Returns null if not on a /g/<slug> path
 */
export function getGraetzlSlugFromPath() {
  const path = window.location.pathname;
  const match = path.match(/^\/g\/([^\/]+)\/?$/);
  return match ? match[1] : null;
}

/**
 * Update the browser URL to reflect the selected Grätzl
 * Uses history.pushState to avoid page reload
 */
export function updateUrlForGraetzl(graetzl) {
  if (graetzl) {
    const slug = graetzlNameToSlug(graetzl.properties.Graetzl_Name);
    const newUrl = `/g/${slug}`;

    // Only push if URL is different
    if (window.location.pathname !== newUrl) {
      window.history.pushState({ graetzl: slug }, '', newUrl);
    }
  } else {
    // No Grätzl selected, go back to root
    if (window.location.pathname !== '/') {
      window.history.pushState({ graetzl: null }, '', '/');
    }
  }
}

export default {
  graetzlNameToSlug,
  findGraetzlBySlug,
  getGraetzlSlugFromPath,
  updateUrlForGraetzl
};
