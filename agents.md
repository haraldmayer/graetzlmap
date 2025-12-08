# Grätzlmap - Agent Development Guide

## Project Overview

Grätzlmap is an interactive guide to Vienna's neighborhoods (called "Grätzl" in Viennese dialect). The application features an interactive map where users can explore different neighborhoods and discover points of interest (POIs) within them.

## Tech Stack

- **Framework**: Astro (v5.16.4) - Static site generator
- **Mapping**: Leaflet.js (v1.9.4) - Interactive map library
- **Geo Database**: GeoJSON (file-based, no runtime required)
- **Spatial Queries**: Turf.js (@turf/turf) - Client-side geospatial analysis
- **Styling**: Vanilla CSS with CSS Grid layout
- **Map Tiles**: CARTO Light (greyscale basemap)
- **Language**: German (de) for user-facing content

## Architecture

### Single-Page Application
The entire application is contained in `src/pages/index.astro` with:
- HTML structure in the template section
- Client-side JavaScript for map interactions (within `<script type="module">` tags)
- Scoped styles (within `<style>` tags)
- Geo query library (`src/lib/geoquery.js`) for data access

### Data Structure

**GeoJSON FeatureCollection** (public/data/geodata.geojson):
All geographic data is stored in a single GeoJSON file containing:

1. **Grätzl Features** (Polygons):
```json
{
  "type": "Feature",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[lng, lat], [lng, lat], ...]]
  },
  "properties": {
    "graetzlId": "freihausviertel",
    "name": "Freihausviertel",
    "center": [lng, lat],
    "zoom": 15
  }
}
```

2. **POI Features** (Points):
```json
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [lng, lat]
  },
  "properties": {
    "graetzlId": "freihausviertel",
    "name": "POI Name",
    "category": "restaurant",
    "description": "Description text",
    "link": "https://example.com"
  }
}
```

**Important**: GeoJSON uses `[longitude, latitude]` order, while Leaflet uses `[latitude, longitude]`. The geoquery library handles conversions automatically.

Data is loaded once via `geoquery.loadGeoData()` and cached in memory.

### Benefits of GeoJSON Architecture

**Why GeoJSON?**
- **Standard Format**: Industry-standard for geographic data
- **No Runtime**: Pure text files, no database server required
- **Version Control**: Git-friendly, easy to track changes
- **Tool Support**: Works with QGIS, geojson.io, and other GIS tools
- **Performance**: ~50-100KB for full dataset, <20KB gzipped
- **Spatial Queries**: Turf.js enables advanced filtering without a database

**Query Capabilities:**
- Filter by neighborhood, category, or both
- Point-in-polygon (find neighborhood for any coordinate)
- Radius search (find POIs within distance)
- Text search across names and descriptions
- All operations run client-side in <1ms

## Key Features

### Map Functionality
- **Initial View**: Vienna center (48.2082°N, 16.3738°E) at zoom level 12
- **Greyscale Styling**: CARTO Light basemap for clean, neutral appearance
- **Neighborhood Highlighting**: Semi-transparent red overlay with outline
- **Zoom Animation**: Smooth transition when selecting a Grätzl

### Interactive Elements
- **Navigation Sidebar**: List of Grätzl with active state management
- **POI Markers**: Custom emoji icons with hover effects
- **Popups**: Click markers to show detailed information
- **Responsive Design**: Mobile-friendly with horizontal scrolling navigation

## Development Guidelines

### Adding POIs

POIs are added as Point features in the `geodata.geojson` file:

```json
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [16.xxxx, 48.xxxx]
  },
  "properties": {
    "graetzlId": "freihausviertel",
    "name": "POI Name",
    "category": "cafe",
    "description": "Detailed description of the location",
    "link": "https://example.com/link"
  }
}
```

**Note**: Coordinates in GeoJSON are `[longitude, latitude]` order.

**Available Categories** (defined in `public/data/categories.json`):
- `restaurant` - 🍽️ Restaurant
- `cafe` - ☕ Café
- `breakfast` - 🥐 Frühstück
- `bar` - 🍺 Bar
- `gasthaus` - 🍺 Gasthaus
- `bookshop` - 📚 Buchhandlung
- `shop` - 🛍️ Geschäft
- `market` - 🛍️ Markt
- `cinema` - 🎬 Kino
- `theater` - 🎭 Theater
- `museum` - 🏛️ Museum
- `gallery` - 🎨 Galerie
- `park` - 🌳 Park
- `culture` - 🎪 Kultur

To add a new category, edit `public/data/categories.json`:
```json
"newcategory": {
  "name": "Display Name",
  "emoji": "🎯",
  "image": null
}
```

### Coordinate Tips

**Finding Boundaries**:
1. Use [geojson.io](http://geojson.io/) to draw neighborhood polygons
2. Copy the entire Feature object from the GeoJSON output
3. GeoJSON coordinates are already in correct `[lng, lat]` order
4. The polygon is automatically closed (first point = last point)

**POI Placement**:
- Click on exact location in OpenStreetMap or geojson.io
- GeoJSON coordinates are in `[longitude, latitude]` format
- Vienna coordinates: ~48.1-48.3°N (lat), 16.2-16.5°E (lng)
- Verify accuracy by testing in the application

## Code Conventions

### Naming
- **Grätzl IDs**: lowercase, no spaces (e.g., `freihausviertel`)
- **CSS Classes**: kebab-case (e.g., `graetzl-btn`)
- **Variables**: camelCase (e.g., `currentPolygon`)

### Styling
- **Colors**:
  - Primary: `#667eea` (purple/blue)
  - Accent: `#764ba2` (purple)
  - Highlight: `#FF6B6B` (red for neighborhood overlay)
  - Text: `#333` (dark gray)
  - Background: `#f5f5f5` (light gray)
- **Spacing**: Use rem units (1rem = 16px)
- **Borders**: 8px border-radius for modern look

### State Management
- `currentPolygon`: Stores active neighborhood overlay
- `currentMarkers`: Array of visible POI markers
- Active button state managed via `.active` class

## Common Tasks

### Change Map Style
Modify tile layer URL (src/pages/index.astro:39):
```javascript
// Current: CARTO Light (greyscale)
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {...})

// Alternative: CARTO Dark
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {...})

// Alternative: OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {...})
```

### Customize Neighborhood Overlay Color
Edit polygon style (src/pages/index.astro:130-135):
```javascript
currentPolygon = L.polygon(graetzl.bounds, {
  color: '#FF6B6B',        // Border color
  fillColor: '#FF6B6B',    // Fill color
  fillOpacity: 0.2,        // Transparency (0-1)
  weight: 3                // Border width in pixels
})
```

### Adjust Default Zoom Level
Change initial view (src/pages/index.astro:36) or per-Grätzl zoom (in graetzlData):
```javascript
const map = L.map('map').setView([48.2082, 16.3738], 12); // Last param is zoom
```

### Modify Popup Styling
Edit CSS (src/pages/index.astro:295-343) or popup options (src/pages/index.astro:156-159)

## Vienna Districts Reference

Vienna is divided into 23 districts (Bezirke). Common Grätzl by district:

- **1st (Innere Stadt)**: Freihausviertel (current), Stubenviertiel
- **2nd (Leopoldstadt)**: Karmeliterviertel, Stuwerviertel
- **3rd (Landstraße)**: Weißgerber, Botschaftsviertel
- **4th (Wieden)**: Freihausviertel (current)
- **5th (Margareten)**: Hundsturm, Margareten
- **6th (Mariahilf)**: Mariahilf, Gumpendorf
- **7th (Neubau)**: Neubau, Spittelberg
- **8th (Josefstadt)**: Josefstadt
- **9th (Alsergrund)**: Alsergrund, Servitenviertel

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:4321)
npm run build        # Build for production
npm run preview      # Preview production build
```

## File Structure

```
/graetzlmap
├── src/
│   ├── lib/
│   │   └── geoquery.js                # Geo query helper library
│   ├── components/
│   │   └── FilterExample.astro        # Example filter component
│   └── pages/
│       └── index.astro                # Main application file
├── public/
│   ├── data/
│   │   ├── geodata.geojson            # All geographic data (Grätzl + POIs)
│   │   ├── categories.json            # POI category definitions (icons)
│   │   └── graetzl/                   # Legacy JSON files (kept for reference)
│   │       ├── freihausviertel.json
│   │       ├── nibelungenviertel.json
│   │       └── neutorviertel.json
│   └── favicon.svg                    # Site icon
├── package.json                       # Dependencies
└── agents.md                          # This file (complete project documentation)
```

## GeoQuery API Reference

The `geoquery.js` library provides powerful spatial query capabilities using Turf.js. All queries run client-side in <1ms.

### Loading Data

```javascript
import geoquery from '/src/lib/geoquery.js';

// Load and cache GeoJSON data
const geoData = await geoquery.loadGeoData();
// Returns: FeatureCollection with all Grätzl and POI features
```

### Basic Queries

```javascript
// Get all Grätzl (neighborhood) features
const graetzls = geoquery.getGraetzlFeatures(geoData);
// Returns: Array of Polygon features

// Get all POI features
const allPOIs = geoquery.getPOIFeatures(geoData);
// Returns: Array of Point features

// Get specific Grätzl by ID
const freihausviertel = geoquery.getGraetzl(geoData, 'freihausviertel');
// Returns: Single Polygon feature or undefined
```

### Filtering POIs

```javascript
// Get all POIs in a specific Grätzl
const fhvPOIs = geoquery.getPOIsByGraetzl(geoData, 'freihausviertel');

// Get all POIs of a specific category (across all Grätzl)
const restaurants = geoquery.getPOIsByCategory(geoData, 'restaurant');

// Combined filter: category + neighborhood
const fhvRestaurants = geoquery.filterPOIs(geoData, {
  graetzlId: 'freihausviertel',
  category: 'restaurant'
});

// Filter by multiple categories
const foodPlaces = geoquery.filterPOIs(geoData, {
  graetzlId: 'freihausviertel',
  categories: ['restaurant', 'cafe', 'gasthaus']
});

// Filter without specifying neighborhood (all Grätzl)
const allCafes = geoquery.filterPOIs(geoData, {
  categories: ['cafe', 'breakfast']
});
```

**Filter Options:**
- `graetzlId`: string (optional) - Filter by neighborhood
- `category`: string (optional) - Filter by single category
- `categories`: string[] (optional) - Filter by multiple categories

### Spatial Queries

```javascript
// Find which Grätzl contains a point
const point = [16.3650, 48.1960]; // [lng, lat]
const graetzl = geoquery.findGraetzlAtPoint(geoData, point);
// Returns: Polygon feature or null

// Get POIs near a point (within radius)
const nearby = geoquery.getPOIsNearPoint(geoData, point, 0.5); // 0.5km
// Returns: Array of POI features within radius

// Point-in-polygon validation (ensures POIs are actually inside boundary)
const poisInside = geoquery.getPOIsInGraetzl(geoData, 'freihausviertel');
// Returns: Array of POI features that are geometrically inside the polygon
```

### Text Search

```javascript
// Search POI names and descriptions
const results = geoquery.searchPOIs(geoData, 'kaffee');
// Returns: Array of POI features matching search text (case-insensitive)

// Get all unique categories
const categories = geoquery.getAllCategories(geoData);
// Returns: ['bar', 'bookshop', 'breakfast', 'cafe', 'cinema', ...]
```

### Coordinate Conversion

GeoJSON uses `[longitude, latitude]` order, while Leaflet uses `[latitude, longitude]`. The geoquery library handles conversions:

```javascript
// Convert GeoJSON feature to Leaflet coordinates
const leafletCoords = geoquery.featureToLeafletCoords(poiFeature);
// Point: [48.1960, 16.3650] (lat, lng)
// Polygon: [[48.2025, 16.3685], [48.2024, 16.3695], ...]

// Convert Leaflet coordinates to GeoJSON format
const geoCoords = geoquery.leafletCoordsToGeoJSON([48.1960, 16.3650]);
// Returns: [16.3650, 48.1960] (lng, lat)
```

### Complete Example: Building a Filter UI

```javascript
import geoquery from '/src/lib/geoquery.js';

// Initialize
const geoData = await geoquery.loadGeoData();

// Get filter options for UI
const neighborhoods = geoquery.getGraetzlFeatures(geoData).map(g => ({
  id: g.properties.graetzlId,
  name: g.properties.name
}));

const categories = geoquery.getAllCategories(geoData);

// Apply filters based on user selection
function applyFilters(selectedNeighborhood, selectedCategories) {
  const filters = {};

  if (selectedNeighborhood) {
    filters.graetzlId = selectedNeighborhood;
  }

  if (selectedCategories.length > 0) {
    filters.categories = selectedCategories;
  }

  return geoquery.filterPOIs(geoData, filters);
}

// Usage
const results = applyFilters('freihausviertel', ['restaurant', 'cafe']);
// Display results on map...
```

### Performance Notes

- **First load**: ~50-100KB GeoJSON file (gzipped: ~15-20KB)
- **Cached**: Instant subsequent loads (in-memory cache)
- **Query speed**: All queries <1ms on modern browsers
- **Turf.js**: ~90KB minified (loaded once, shared across queries)

## Future Enhancement Ideas

### Data Management
- Create TypeScript types for type safety
- Add GeoJSON schema validation
- Spatial index for large datasets (>1000 POIs)
- Tile-based data loading for better performance

### Features
- ✅ **IMPLEMENTED**: GeoJSON-based geo database
- ✅ **IMPLEMENTED**: Spatial query support (filtering, point-in-polygon, radius search)
- ✅ **IMPLEMENTED**: Text search functionality
- Filter UI by POI type (see FilterExample.astro)
- User location/geolocation
- Share links to specific Grätzl
- Multi-language support (English, German)
- User-submitted POIs
- Photo galleries for POIs
- Integration with real business data (Google Places, etc.)

### UX Improvements
- Clustering for dense POI areas
- Route planning between POIs
- Distance calculations
- Opening hours integration
- User reviews/ratings
- Favorites system

### Performance
- Lazy load Grätzl data
- Optimize marker rendering for many POIs
- Service worker for offline support
- Image optimization for POI photos

## Troubleshooting

### Map Not Displaying
- Check Leaflet CSS is loaded before JavaScript
- Verify container `#map` has explicit height
- Check browser console for tile loading errors

### Markers Not Appearing
- Verify coordinates are [lat, lng] not [lng, lat]
- Check coordinates are within bounds (Vienna: ~48.1-48.3°N, 16.2-16.5°E)
- Ensure emoji icons render in browser

### Navigation Not Working
- Check `data-graetzl` attribute matches key in `graetzlData`
- Verify event listeners are attached after DOM loads
- Check for JavaScript errors in console

## Resources

- [Leaflet Documentation](https://leafletjs.com/reference.html) - Map library
- [Turf.js Documentation](https://turfjs.org/docs/) - Spatial analysis
- [GeoJSON Specification](https://geojson.org/) - Data format standard
- [Astro Documentation](https://docs.astro.build) - Framework
- [OpenStreetMap](https://www.openstreetmap.org) - Map data source
- [GeoJSON.io](http://geojson.io) - Draw and edit GeoJSON
- [CARTO Basemaps](https://github.com/CartoDB/basemap-styles) - Map styles

## Contact & Contributions

When adding new Grätzl, consider:
1. Historical/cultural significance
2. Distinct character or identity
3. Local business/POI density
4. Community recognition of the name

Keep descriptions concise, informative, and welcoming to both locals and tourists.
