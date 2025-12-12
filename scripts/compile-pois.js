import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('📦 Compiling POIs into static JSON...');

const poisDir = join(__dirname, '..', 'public', 'data', 'pois');
const outputFile = join(__dirname, '..', 'public', 'data', 'all-pois.json');

try {
  // Read all POI files
  const files = readdirSync(poisDir).filter(f => f.endsWith('.json'));

  const pois = files.map(file => {
    const content = readFileSync(join(poisDir, file), 'utf-8');
    return JSON.parse(content);
  });

  console.log(`✅ Compiled ${pois.length} POIs`);

  // Write compiled file
  writeFileSync(outputFile, JSON.stringify(pois, null, 2));
  console.log(`✅ Written to /public/data/all-pois.json`);

} catch (error) {
  console.error('❌ Error compiling POIs:', error);
  process.exit(1);
}
