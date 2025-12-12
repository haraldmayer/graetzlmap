import { rmSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distDir = join(__dirname, '..', 'dist');

console.log('🧹 Cleaning up CMS and API routes from production build...');

// Remove CMS page
const cmsPath = join(distDir, 'cms');
if (existsSync(cmsPath)) {
  rmSync(cmsPath, { recursive: true, force: true });
  console.log('✅ Removed /cms');
}

const cmsHtmlPath = join(distDir, 'cms.html');
if (existsSync(cmsHtmlPath)) {
  rmSync(cmsHtmlPath, { recursive: true, force: true });
  console.log('✅ Removed cms.html');
}

// Remove API routes (they won't work in static deployment anyway)
const apiPath = join(distDir, 'api');
if (existsSync(apiPath)) {
  rmSync(apiPath, { recursive: true, force: true });
  console.log('✅ Removed /api');
}

console.log('✨ Production build cleaned successfully!');
