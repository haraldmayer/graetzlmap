# Grätzlmap - Agent Development Guide

## Project Overview

Grätzlmap is an interactive guide to Vienna's neighborhoods (called "Grätzl" in Viennese dialect). The application features an interactive map where users can explore different neighborhoods and discover points of interest (POIs) within them.

## Tech Stack

- **Framework**: Astro (v5.16.4) - Static site generator
- **Mapping**: Leaflet.js (v1.9.4) - Interactive map library
- **Styling**: Vanilla CSS with CSS Grid layout
- **Map Tiles**: CARTO Light (greyscale basemap)
- **Language**: German (de) for user-facing content

## Architecture

### Single-Page Application
The entire application is contained in `src/pages/index.astro` with:
- HTML structure in the template section
- Client-side JavaScript for map interactions (within `<script>` tags)
- Scoped styles (within `<style>` tags)

### Data Structure
Grätzl data is split between a registry and individual JSON files:

**Registry** (src/pages/index.astro:47-51):
```javascript
const graetzlRegistry = {
  [graetzlId]: {
    dataFile: string  // Path to JSON file in /public/data/graetzl/
  }
}
```

**JSON Data Files** (public/data/graetzl/[graetzlId].json):
```json
{
  "name": "Grätzl Name",
  "center": [lat, lng],
  "zoom": 15,
  "bounds": [
    [lat, lng],
    [lat, lng],
    [lat, lng],
    [lat, lng],
    [lat, lng]
  ],
  "pois": [
    {
      "name": "POI Name",
      "type": "category",
      "coords": [lat, lng],
      "icon": "🎨",
      "description": "Description text",
      "link": "https://example.com"
    }
  ]
}
```

Data is loaded dynamically via `fetch()` and cached in memory (`graetzlCache`).

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

### Adding a New Grätzl

1. **Find Coordinates**:
   - Use [OpenStreetMap](https://www.openstreetmap.org/) or Google Maps
   - Get center coordinates and boundary polygon points
   - Ensure coordinates are in [latitude, longitude] format

2. **Create JSON Data File** (public/data/graetzl/[graetzlId].json):
   ```json
   {
     "name": "Neuer Grätzl",
     "center": [48.xxxx, 16.xxxx],
     "zoom": 15,
     "bounds": [
       [48.xxxx, 16.xxxx],
       [48.xxxx, 16.xxxx],
       [48.xxxx, 16.xxxx],
       [48.xxxx, 16.xxxx],
       [48.xxxx, 16.xxxx]
     ],
     "pois": []
   }
   ```

3. **Register in graetzlRegistry** (src/pages/index.astro:47-51):
   ```javascript
   neuergraetzl: {
     dataFile: '/data/graetzl/neuergraetzl.json'
   }
   ```

4. **Add Navigation Button** (src/pages/index.astro:23-25):
   ```html
   <li><button class="graetzl-btn" data-graetzl="neuergraetzl">Neuer Grätzl</button></li>
   ```

### Adding POIs

POIs are added directly to the Grätzl's JSON file in the `pois` array:

```json
{
  "name": "POI Name",
  "category": "cafe",
  "coords": [48.xxxx, 16.xxxx],
  "description": "Detailed description of the location",
  "link": "https://example.com/link"
}
```

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
2. Copy coordinates from GeoJSON output
3. Convert from [lng, lat] to [lat, lng] if needed
4. Close the polygon (first point = last point)

**POI Placement**:
- Click on exact location in OpenStreetMap
- Copy coordinates from URL or right-click menu
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
│   └── pages/
│       └── index.astro                # Main application file
├── public/
│   ├── data/
│   │   ├── categories.json            # POI category definitions (icons)
│   │   └── graetzl/
│   │       ├── freihausviertel.json   # Freihausviertel data & POIs
│   │       └── nibelungenviertel.json # Nibelungenviertel data & POIs
│   └── favicon.svg                    # Site icon
├── package.json                       # Dependencies
└── agents.md                         # This file
```

## Future Enhancement Ideas

### Data Management
- Create TypeScript types for type safety
- Add data validation for JSON files
- Add JSON schema validation

### Features
- Search functionality for POIs
- Filter by POI type (restaurants, culture, etc.)
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

- [Leaflet Documentation](https://leafletjs.com/reference.html)
- [Astro Documentation](https://docs.astro.build)
- [OpenStreetMap](https://www.openstreetmap.org) - Map data
- [GeoJSON.io](http://geojson.io) - Draw boundaries
- [CARTO Basemaps](https://github.com/CartoDB/basemap-styles) - Map styles

## Contact & Contributions

When adding new Grätzl, consider:
1. Historical/cultural significance
2. Distinct character or identity
3. Local business/POI density
4. Community recognition of the name

Keep descriptions concise, informative, and welcoming to both locals and tourists.
