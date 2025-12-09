import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const POIS_DIR = path.join(__dirname, '..', 'public', 'data', 'pois');

console.log('Starting POI migration to multilingual format...');
console.log('POI directory:', POIS_DIR);

// Get all POI files
const files = fs.readdirSync(POIS_DIR).filter(f => f.endsWith('.json'));
console.log(`Found ${files.length} POI files to migrate`);

let migrated = 0;
let skipped = 0;

files.forEach(file => {
  const filepath = path.join(POIS_DIR, file);
  const content = fs.readFileSync(filepath, 'utf8');
  const poi = JSON.parse(content);

  // Check if description is already multilingual
  if (poi.properties.description && typeof poi.properties.description === 'object') {
    console.log(`Skipping ${file} - already multilingual`);
    skipped++;
    return;
  }

  // Convert description to multilingual format
  const description = poi.properties.description || '';
  poi.properties.description = {
    de: description,
    en: description // Initially use German text as placeholder for English
  };

  // Save updated POI
  fs.writeFileSync(filepath, JSON.stringify(poi, null, 2));
  console.log(`Migrated ${file}`);
  migrated++;
});

console.log('\nMigration complete!');
console.log(`Migrated: ${migrated}`);
console.log(`Skipped: ${skipped}`);
console.log(`Total: ${files.length}`);
