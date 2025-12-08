import { readFileSync, writeFileSync } from 'fs';
import { simplify } from '@turf/turf';

const inputFile = './public/data/graetzl_wien2025.json';
const outputFile = './public/data/graetzl_wien2025.json';

// Read the GeoJSON file
const geojson = JSON.parse(readFileSync(inputFile, 'utf8'));

let simplifiedCount = 0;
let totalReduction = 0;

// Process each feature
geojson.features = geojson.features.map(feature => {
  if (feature.geometry && feature.geometry.type === 'Polygon') {
    // Count nodes in the polygon
    const coordinates = feature.geometry.coordinates[0]; // Get outer ring
    const nodeCount = coordinates.length;

    if (nodeCount > 20) {
      // Simplify the polygon
      // tolerance: smaller = more detail, larger = more simplified
      // We'll use a tolerance that aims to keep the shape recognizable
      const simplified = simplify(feature, { tolerance: 0.0001, highQuality: true });

      const newNodeCount = simplified.geometry.coordinates[0].length;
      console.log(`Simplified ${feature.properties?.name || 'unnamed'}: ${nodeCount} -> ${newNodeCount} nodes`);

      simplifiedCount++;
      totalReduction += (nodeCount - newNodeCount);

      return simplified;
    }
  }

  return feature;
});

// Write the simplified GeoJSON back to file
writeFileSync(outputFile, JSON.stringify(geojson, null, 2));

console.log(`\nDone! Simplified ${simplifiedCount} polygons.`);
console.log(`Total nodes reduced: ${totalReduction}`);
console.log(`Output written to: ${outputFile}`);
