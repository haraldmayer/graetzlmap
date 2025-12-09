/**
 * Map initialization and interaction logic for Grätzlmap
 */

import geoquery from './geoquery.js';
import { findGraetzlBySlug, getGraetzlSlugFromPath, updateUrlForGraetzl } from './slug-utils.js';

window.addEventListener('load', async function() {
	// Initialize map centered on Vienna
	const map = L.map('map').setView([48.2082, 16.3738], 12);

	// Add greyscale tile layer
	L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
		subdomains: 'abcd',
		maxZoom: 19
	}).addTo(map);

	// Load data
	let geoData = null;
	let graetzlData = null;
	try {
		geoData = await geoquery.loadGeoData();
		graetzlData = await geoquery.loadGraetzlData();
		console.log('POI data loaded:', geoData.features.length, 'features');
		console.log('Grätzl data loaded:', graetzlData.features.length, 'features');
	} catch (error) {
		console.error('Error loading data:', error);
		return;
	}

	// Category definitions (icons and metadata)
	let categories = {};

	let currentPolygon = null;
	let currentMarkers = [];
	let currentGraetzlId = null; // Track currently selected Grätzl
	let selectedCategories = new Set(); // Track selected categories
	let currentWalkthrough = null; // Track currently active walkthrough
	let walkthroughData = []; // Store walkthrough data
	let walkthroughArrows = []; // Store walkthrough arrow layers

	// Language setting - defaults to German
	const currentLanguage = 'de';

	// Helper function to get translated text
	function getTranslated(text, fallbackLang = 'de') {
		if (!text) return '';
		if (typeof text === 'string') return text;
		return text[currentLanguage] || text[fallbackLang] || Object.values(text)[0] || '';
	}

	// Function to load categories
	async function loadCategories() {
		try {
			const response = await fetch('/data/categories.json');
			if (!response.ok) {
				throw new Error('Failed to load categories');
			}
			const data = await response.json();
			categories = data.categories;
		} catch (error) {
			console.error('Error loading categories:', error);
		}
	}

	// Function to load walkthroughs
	async function loadWalkthroughs() {
		try {
			const response = await fetch('/api/walkthroughs');
			if (!response.ok) {
				throw new Error('Failed to load walkthroughs');
			}
			walkthroughData = await response.json();
			console.log('Walkthroughs loaded:', walkthroughData.length);
		} catch (error) {
			console.error('Error loading walkthroughs:', error);
			walkthroughData = [];
		}
	}

	// Function to get icon for category
	function getCategoryIcon(category) {
		// Fallback if categories not loaded yet
		if (!categories || Object.keys(categories).length === 0) {
			console.warn('Categories not loaded yet');
			return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>';
		}
		const cat = categories[category];
		if (!cat) {
			console.warn(`Category "${category}" not found, using default`);
			return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>';
		}
		// Use icon (SVG) if available, otherwise fall back to emoji
		return cat.icon || cat.emoji;
	}

	// Function to get background color for category
	function getCategoryColor(category) {
		if (!categories || Object.keys(categories).length === 0) {
			return '#FFFFFF';
		}
		const cat = categories[category];
		return cat?.color || '#FFFFFF';
	}

	// Function to calculate marker size based on zoom level
	function getMarkerSize(zoom) {
		return Math.max(10, Math.min(50, 10 + (zoom - 10) * 3.33));
	}

	// Function to create custom icon
	function createCustomIcon(category, zoom) {
		const icon = getCategoryIcon(category);
		const color = getCategoryColor(category);
		const size = getMarkerSize(zoom || map.getZoom());
		return L.divIcon({
			html: `<div class="custom-marker" style="width: ${size}px; height: ${size}px; font-size: ${size * 0.7}px; line-height: ${size}px; background-color: ${color};">${icon}</div>`,
			className: 'custom-icon',
			iconSize: [size, size],
			iconAnchor: [size / 2, size],
			popupAnchor: [0, -size]
		});
	}

	// Function to update marker sizes based on current zoom
	function updateMarkerSizes() {
		const currentZoom = map.getZoom();
		const size = getMarkerSize(currentZoom);

		currentMarkers.forEach((marker) => {
			const iconElement = marker._icon;
			if (iconElement) {
				const markerDiv = iconElement.querySelector('.custom-marker');
				if (markerDiv) {
					markerDiv.style.width = size + 'px';
					markerDiv.style.height = size + 'px';
					markerDiv.style.fontSize = (size * 0.7) + 'px';
					markerDiv.style.lineHeight = size + 'px';
				}

				iconElement.style.width = size + 'px';
				iconElement.style.height = size + 'px';
				iconElement.style.marginLeft = (-size / 2) + 'px';
				iconElement.style.marginTop = (-size) + 'px';
			}
		});
	}

	// Function to create category filter UI
function createCategoryFilters() {
	const container = document.getElementById('category-filters');
	const dropdown = document.getElementById('category-dropdown');
	const toggle = document.getElementById('category-toggle');
	const toggleText = toggle.querySelector('.category-toggle-text');
	const searchInput = document.getElementById('category-search');
	const selectAllBtn = document.getElementById('select-all-categories');
	const deselectAllBtn = document.getElementById('deselect-all-categories');

	const allCategories = geoquery.getAllCategories(geoData);

	// Create category checkboxes
	allCategories.forEach(categoryId => {
		const categoryInfo = categories[categoryId];
		if (!categoryInfo) return;

		const label = document.createElement('label');
		label.className = 'category-filter';
		label.dataset.categoryId = categoryId;
		label.dataset.categoryName = getTranslated(categoryInfo.name).toLowerCase();

		const checkbox = document.createElement('input');
		checkbox.type = 'checkbox';
		checkbox.value = categoryId;
		checkbox.checked = true; // All selected by default
		checkbox.addEventListener('change', () => {
			updateCategorySelection();
		});

		const icon = document.createElement('span');
		icon.className = 'category-icon';
		icon.innerHTML = categoryInfo.icon || categoryInfo.emoji;

		const name = document.createElement('span');
		name.className = 'category-name';
		name.textContent = getTranslated(categoryInfo.name);

		label.appendChild(checkbox);
		label.appendChild(icon);
		label.appendChild(name);
		container.appendChild(label);
	});

	// Update category selection and markers
	function updateCategorySelection() {
		const allCheckboxes = container.querySelectorAll('input[type="checkbox"]');
		selectedCategories.clear();

		let checkedCount = 0;
		allCheckboxes.forEach(cb => {
			if (cb.checked) {
				checkedCount++;
				selectedCategories.add(cb.value);
			}
		});

		// If all are checked, clear the set (means "show all")
		if (checkedCount === allCheckboxes.length) {
			selectedCategories.clear();
		}

		// Update toggle button text
		if (checkedCount === 0) {
			toggleText.textContent = 'Keine Kategorien';
		} else if (checkedCount === allCheckboxes.length) {
			toggleText.textContent = 'Alle Kategorien';
		} else {
			toggleText.textContent = `${checkedCount} von ${allCheckboxes.length} Kategorien`;
		}

		updateMarkers();
	}

	// Toggle dropdown
	toggle.addEventListener('click', (e) => {
		e.stopPropagation();
		const isVisible = dropdown.style.display === 'block';
		dropdown.style.display = isVisible ? 'none' : 'block';
		if (!isVisible) {
			searchInput.focus();
		}
	});

	// Select all button
	selectAllBtn.addEventListener('click', () => {
		const checkboxes = container.querySelectorAll('input[type="checkbox"]');
		checkboxes.forEach(cb => cb.checked = true);
		updateCategorySelection();
	});

	// Deselect all button
	deselectAllBtn.addEventListener('click', () => {
		const checkboxes = container.querySelectorAll('input[type="checkbox"]');
		checkboxes.forEach(cb => cb.checked = false);
		updateCategorySelection();
	});

	// Search functionality
	searchInput.addEventListener('input', (e) => {
		const searchTerm = e.target.value.toLowerCase();
		const labels = container.querySelectorAll('.category-filter');

		labels.forEach(label => {
			const categoryName = label.dataset.categoryName;
			if (categoryName.includes(searchTerm)) {
				label.style.display = 'flex';
			} else {
				label.style.display = 'none';
			}
		});
	});

	// Close dropdown when clicking outside
	document.addEventListener('click', (e) => {
		if (!e.target.closest('.category-filter-container')) {
			dropdown.style.display = 'none';
		}
	});

	// Prevent dropdown from closing when clicking inside
	dropdown.addEventListener('click', (e) => {
		e.stopPropagation();
	});

	// Initial text update
	updateCategorySelection();
}

	// Function to show all POIs (default view)
	function showAllPOIs() {
		currentGraetzlId = null;

		// Remove polygon if exists
		if (currentPolygon) {
			map.removeLayer(currentPolygon);
			currentPolygon = null;
		}

		// Reset to Vienna center view
		map.setView([48.2082, 16.3738], 14); // Zoom 14 ≈ 1km radius

		// Update markers based on current category filter
		updateMarkers();

		// Update search input
		const searchInput = document.getElementById('graetzl-search');
		searchInput.value = '';
		searchInput.placeholder = 'Alle Grätzl werden angezeigt';
		searchInput.dataset.selected = 'false';
		selectedGraetzl = null;
	}

	// Function to show specific Grätzl
	function showGraetzl(graetzlId) {
		if (!graetzlId) {
			showAllPOIs();
			return;
		}

		currentGraetzlId = graetzlId;

		// Get Grätzl feature from graetzl data
		const graetzlFeature = geoquery.getGraetzl(graetzlData, parseInt(graetzlId));
		if (!graetzlFeature) {
			console.error(`Grätzl "${graetzlId}" not found`);
			return;
		}

		// Remove previous polygon
		if (currentPolygon) {
			map.removeLayer(currentPolygon);
		}

		// Convert GeoJSON polygon to Leaflet coordinates
		const bounds = geoquery.featureToLeafletCoords(graetzlFeature);

		// Add polygon overlay for the neighborhood
		currentPolygon = L.polygon(bounds, {
			color: '#FF6B6B',
			fillColor: '#FF6B6B',
			fillOpacity: 0.2,
			weight: 3
		}).addTo(map);

		// Fit map to polygon bounds
		map.fitBounds(currentPolygon.getBounds(), { padding: [50, 50] });

		// Update markers (will filter by Grätzl and categories)
		updateMarkers();

		// Dropdown is updated by selectGraetzl function
	}

	// Function to update markers based on filters
	function updateMarkers() {
		// Remove all current markers
		currentMarkers.forEach(marker => map.removeLayer(marker));
		currentMarkers = [];

		let poiFeatures = [];

		// If in walkthrough mode, only show walkthrough POIs
		if (currentWalkthrough && currentWalkthrough.pois && currentWalkthrough.pois.length > 0) {
			// Filter to only show POIs in the walkthrough
			poiFeatures = geoData.features.filter(feature =>
				currentWalkthrough.pois.includes(feature.properties.id)
			);
		} else {
			// Build filter
			const filters = {};
			if (currentGraetzlId) {
				filters.graetzlId = parseInt(currentGraetzlId);
			}
			if (selectedCategories.size > 0) {
				filters.categories = Array.from(selectedCategories);
			}

			// Get filtered POIs using spatial query
			poiFeatures = geoquery.filterPOIsWithGraetzl(geoData, graetzlData, filters);
		}

		// Add markers
		poiFeatures.forEach(poiFeature => {
			const poi = poiFeature.properties;
			const coords = geoquery.featureToLeafletCoords(poiFeature);
			const icon = getCategoryIcon(poi.category);

			const marker = L.marker(coords, {
				icon: createCustomIcon(poi.category, map.getZoom())
			}).addTo(map);

			// Create popup content
			const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${coords[0]},${coords[1]}`;
			const learnMoreLink = poi.link ? `<a href="${poi.link}" target="_blank" class="poi-link">Website →</a>` : '';

			// Get category info
			const categoryInfo = categories[poi.category];
			const categoryName = categoryInfo ? `${categoryInfo.emoji} ${getTranslated(categoryInfo.name)}` : '';

			// Format tags if available
			const tags = poi.tags || [];
			const tagsHtml = tags.length > 0
				? `<div class="poi-tags">${tags.map(tag => `<span class="poi-tag">${tag}</span>`).join('')}</div>`
				: '';

			const popupContent = `
				<div class="poi-popup">
					<div class="poi-icon">${icon}</div>
					<h3>${poi.name}</h3>
					${categoryName ? `<div class="poi-category-label">${categoryName}</div>` : ''}
					<p>${getTranslated(poi.description)}</p>
					${tagsHtml}
					<div class="poi-actions">
						${learnMoreLink}
						<a href="${googleMapsUrl}" target="_blank" class="poi-link poi-link-secondary">Route</a>
					</div>
				</div>
			`;

			marker.bindPopup(popupContent, {
				maxWidth: 300,
				className: 'custom-popup'
			});

			currentMarkers.push(marker);
		});
	}

	// Dropdown interactions are handled in populateGraetzlDropdown()

	// Update marker sizes when zoom changes
	map.on('zoomend', updateMarkerSizes);

	// Handle map clicks to activate Grätzl
	map.on('click', (e) => {
		// Convert Leaflet coords [lat, lng] to GeoJSON [lng, lat]
		const point = [e.latlng.lng, e.latlng.lat];

		// Find which Grätzl contains this point
		const graetzl = geoquery.findGraetzlAtPoint(graetzlData, point);

		if (graetzl) {
			// Activate the clicked Grätzl and update URL
			selectGraetzl(graetzl);
		}
	});

	// Searchable dropdown state
	let allGraetzls = [];
	let selectedGraetzl = null;
	let focusedIndex = -1;

	// Function to update clear button visibility
	function updateClearButton() {
		const searchInput = document.getElementById('graetzl-search');
		const clearButton = document.getElementById('clear-graetzl');

		// Show button if there's text or a selection
		if (searchInput.value || searchInput.dataset.selected === 'true') {
			clearButton.style.display = 'flex';
		} else {
			clearButton.style.display = 'none';
		}
	}

	// Function to populate Grätzl dropdown
	function populateGraetzlDropdown() {
		const dropdown = document.getElementById('graetzl-dropdown');
		const searchInput = document.getElementById('graetzl-search');
		const clearButton = document.getElementById('clear-graetzl');
		allGraetzls = geoquery.getGraetzlFeatures(graetzlData);

		// Filter to only show active Grätzl
		allGraetzls = allGraetzls.filter(g => g.properties.active === 1);

		// Sort by name
		allGraetzls.sort((a, b) =>
			a.properties.Graetzl_Name.localeCompare(b.properties.Graetzl_Name, 'de')
		);

		// Add "Alle anzeigen" option
		const allOption = document.createElement('div');
		allOption.className = 'graetzl-option';
		allOption.dataset.id = '';
		allOption.dataset.name = 'Alle anzeigen';
		allOption.textContent = 'Alle anzeigen';
		allOption.addEventListener('click', () => selectGraetzl(null));
		dropdown.appendChild(allOption);

		// Add all Grätzl options
		allGraetzls.forEach(graetzl => {
			const option = document.createElement('div');
			option.className = 'graetzl-option';
			option.dataset.id = graetzl.properties.Graetzl_ID;
			option.dataset.name = graetzl.properties.Graetzl_Name;
			option.textContent = graetzl.properties.Graetzl_Name;
			option.addEventListener('click', () => selectGraetzl(graetzl));
			dropdown.appendChild(option);
		});

		// Clear button functionality
		clearButton.addEventListener('click', () => {
			selectGraetzl(null);
		});

		// Search functionality
		searchInput.addEventListener('input', (e) => {
			focusedIndex = -1; // Reset focus when typing
			filterDropdown(e.target.value);
			updateClearButton();
		});

		// Show dropdown on focus
		searchInput.addEventListener('focus', () => {
			// Clear input if showing default state
			if (searchInput.dataset.selected === 'false' || !searchInput.dataset.selected) {
				searchInput.value = '';
			} else if (selectedGraetzl) {
				// Select the text if a Grätzl is selected
				searchInput.select();
			}
			filterDropdown(searchInput.value);
			dropdown.style.display = 'block';
		});

		// Keyboard navigation
		searchInput.addEventListener('keydown', (e) => {
			const options = Array.from(dropdown.querySelectorAll('.graetzl-option:not([style*="display: none"])'));

			if (e.key === 'ArrowDown') {
				e.preventDefault();
				focusedIndex = Math.min(focusedIndex + 1, options.length - 1);
				updateFocusedOption(options);
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				focusedIndex = Math.max(focusedIndex - 1, -1);
				updateFocusedOption(options);
			} else if (e.key === 'Enter') {
				e.preventDefault();
				if (focusedIndex >= 0 && options[focusedIndex]) {
					options[focusedIndex].click();
				}
			} else if (e.key === 'Escape') {
				dropdown.style.display = 'none';
				searchInput.blur();
			}
		});

		// Close dropdown when clicking outside
		document.addEventListener('click', (e) => {
			if (!e.target.closest('.searchable-select')) {
				dropdown.style.display = 'none';
			}
		});

		console.log('Populated dropdown with', allGraetzls.length, 'Grätzl');
	}

	function filterDropdown(searchTerm) {
		const dropdown = document.getElementById('graetzl-dropdown');
		const options = dropdown.querySelectorAll('.graetzl-option');
		const term = searchTerm.toLowerCase();

		let visibleCount = 0;
		options.forEach(option => {
			const name = option.dataset.name.toLowerCase();
			if (name.includes(term)) {
				option.style.display = 'block';
				visibleCount++;
			} else {
				option.style.display = 'none';
			}
		});

		// Show/hide dropdown based on visible options
		if (visibleCount > 0) {
			dropdown.style.display = 'block';
		} else {
			dropdown.style.display = 'none';
		}
	}

	function updateFocusedOption(options) {
		options.forEach((opt, idx) => {
			if (idx === focusedIndex) {
				opt.classList.add('focused');
				opt.scrollIntoView({ block: 'nearest' });
			} else {
				opt.classList.remove('focused');
			}
		});
	}

	function selectGraetzl(graetzl) {
		const searchInput = document.getElementById('graetzl-search');
		const dropdown = document.getElementById('graetzl-dropdown');

		if (graetzl) {
			selectedGraetzl = graetzl;
			searchInput.value = graetzl.properties.Graetzl_Name;
			searchInput.dataset.selected = 'true';
			showGraetzl(graetzl.properties.Graetzl_ID.toString());

			// Update URL
			updateUrlForGraetzl(graetzl);
		} else {
			selectedGraetzl = null;
			searchInput.value = '';
			searchInput.placeholder = 'Alle Grätzl werden angezeigt';
			searchInput.dataset.selected = 'false';
			showAllPOIs();

			// Update URL to root
			updateUrlForGraetzl(null);
		}

		dropdown.style.display = 'none';
		focusedIndex = -1;
		updateClearButton();
	}

	// Initialize: load categories and show all POIs or selected Grätzl from URL
	async function initialize() {
		try {
			console.log('Loading categories...');
			await loadCategories();
			console.log('Categories loaded:', Object.keys(categories).length);

			console.log('Loading walkthroughs...');
			await loadWalkthroughs();

			// Populate Grätzl dropdown
			populateGraetzlDropdown();

			// Create category filter UI
			createCategoryFilters();

			// Setup walkthrough selector
			setupWalkthroughSelector();

			// Check if a Grätzl is specified in the URL
			const graetzlSlug = getGraetzlSlugFromPath();
			if (graetzlSlug) {
				console.log('Grätzl slug from URL:', graetzlSlug);
				const graetzl = findGraetzlBySlug(graetzlData, graetzlSlug);
				if (graetzl) {
					console.log('Found Grätzl:', graetzl.properties.Graetzl_Name);
					selectGraetzl(graetzl);
				} else {
					console.warn('Grätzl not found for slug:', graetzlSlug);
					showAllPOIs();
				}
			} else {
				console.log('Showing all POIs...');
				showAllPOIs();
			}
		} catch (error) {
			console.error('Initialization error:', error);
		}
	}

	// POI Search functionality
	function setupPOISearch() {
		const searchInput = document.getElementById('poi-search');
		const resultsDiv = document.getElementById('poi-results');

		if (!searchInput || !resultsDiv) return;

		let searchTimeout;

		searchInput.addEventListener('input', (e) => {
			const searchTerm = e.target.value.trim().toLowerCase();

			// Clear previous timeout
			clearTimeout(searchTimeout);

			if (!searchTerm) {
				resultsDiv.style.display = 'none';
				return;
			}

			// Debounce search
			searchTimeout = setTimeout(() => {
				const results = geoData.features.filter(poi => {
					const name = (poi.properties.name || '').toLowerCase();
					const description = (poi.properties.description || '').toLowerCase();
					return name.includes(searchTerm) || description.includes(searchTerm);
				});

				displaySearchResults(results);
			}, 200);
		});

		// Close results when clicking outside
		document.addEventListener('click', (e) => {
			if (!searchInput.contains(e.target) && !resultsDiv.contains(e.target)) {
				resultsDiv.style.display = 'none';
			}
		});
	}

	function displaySearchResults(results) {
		const resultsDiv = document.getElementById('poi-results');

		if (results.length === 0) {
			resultsDiv.innerHTML = '<div class="poi-result-empty">Keine POIs gefunden</div>';
			resultsDiv.style.display = 'block';
			return;
		}

		resultsDiv.innerHTML = results.slice(0, 10).map(poi => {
			const category = categories[poi.properties.category];
			const categoryLabel = category ? `${category.emoji} ${getTranslated(category.name)}` : poi.properties.category;

			return `
				<div class="poi-result-item" data-poi-id="${poi.properties.id}">
					<div class="poi-result-name">${poi.properties.name}</div>
					<div class="poi-result-category">${categoryLabel}</div>
				</div>
			`;
		}).join('');

		// Add click handlers
		resultsDiv.querySelectorAll('.poi-result-item').forEach(item => {
			item.addEventListener('click', () => {
				const poiId = item.dataset.poiId;
				const poi = geoData.features.find(p => p.properties.id === poiId);
				if (poi) {
					centerOnPOI(poi);
					resultsDiv.style.display = 'none';
					document.getElementById('poi-search').value = poi.properties.name;
				}
			});
		});

		resultsDiv.style.display = 'block';
	}

	function centerOnPOI(poi) {
		const coords = poi.geometry.coordinates;
		const latLng = [coords[1], coords[0]]; // GeoJSON uses [lng, lat]

		// Center map on POI with zoom
		map.setView(latLng, 16, {
			animate: true,
			duration: 0.5
		});

		// Find and open the marker's popup
		currentMarkers.forEach(marker => {
			const markerLatLng = marker.getLatLng();
			if (Math.abs(markerLatLng.lat - latLng[0]) < 0.0001 &&
			    Math.abs(markerLatLng.lng - latLng[1]) < 0.0001) {
				marker.openPopup();
			}
		});
	}

	// Draw arrows between walkthrough POIs
	function drawWalkthroughArrows(poiIds) {
		// Clear existing arrows
		clearWalkthroughArrows();

		if (!poiIds || poiIds.length < 2) return;

		// Get POI coordinates
		const coords = [];
		poiIds.forEach(poiId => {
			const poi = geoData.features.find(f => f.properties.id === poiId);
			if (poi) {
				const [lng, lat] = poi.geometry.coordinates;
				coords.push([lat, lng]);
			}
		});

		// Draw arrows between consecutive POIs
		for (let i = 0; i < coords.length - 1; i++) {
			const start = coords[i];
			const end = coords[i + 1];

			// Create a polyline with arrow
			const polyline = L.polyline([start, end], {
				color: '#667eea',
				weight: 3,
				opacity: 0.8,
				smoothFactor: 1
			}).addTo(map);

			// Create arrow decorator
			const arrowHead = L.polylineDecorator(polyline, {
				patterns: [
					{
						offset: '100%',
						repeat: 0,
						symbol: L.Symbol.arrowHead({
							pixelSize: 12,
							polygon: true,
							pathOptions: {
								fillColor: '#667eea',
								fillOpacity: 1,
								weight: 0,
								color: '#667eea'
							}
						})
					},
					{
						offset: '50%',
						repeat: 0,
						symbol: L.Symbol.arrowHead({
							pixelSize: 8,
							polygon: true,
							pathOptions: {
								fillColor: '#667eea',
								fillOpacity: 0.6,
								weight: 0,
								color: '#667eea'
							}
						})
					}
				]
			}).addTo(map);

			walkthroughArrows.push(polyline);
			walkthroughArrows.push(arrowHead);
		}

		// Add number markers at each POI
		coords.forEach((coord, index) => {
			const numberMarker = L.marker(coord, {
				icon: L.divIcon({
					html: `<div style="
						background: #667eea;
						color: white;
						width: 24px;
						height: 24px;
						border-radius: 50%;
						display: flex;
						align-items: center;
						justify-content: center;
						font-weight: bold;
						font-size: 12px;
						border: 2px solid white;
						box-shadow: 0 2px 4px rgba(0,0,0,0.3);
					">${index + 1}</div>`,
					className: 'walkthrough-number',
					iconSize: [24, 24],
					iconAnchor: [12, 12]
				}),
				zIndexOffset: 1000
			}).addTo(map);

			walkthroughArrows.push(numberMarker);
		});
	}

	// Clear walkthrough arrows
	function clearWalkthroughArrows() {
		walkthroughArrows.forEach(layer => {
			map.removeLayer(layer);
		});
		walkthroughArrows = [];
	}

	// Zoom map to fit walkthrough POIs
	function zoomToWalkthroughPOIs(poiIds) {
		if (!poiIds || poiIds.length === 0) return;

		const bounds = [];
		poiIds.forEach(poiId => {
			const poi = geoData.features.find(f => f.properties.id === poiId);
			if (poi) {
				const [lng, lat] = poi.geometry.coordinates;
				bounds.push([lat, lng]);
			}
		});

		if (bounds.length > 0) {
			map.fitBounds(bounds, {
				padding: [50, 50],
				maxZoom: 16
			});
		}
	}

	// Walkthrough selector functionality
	function setupWalkthroughSelector() {
		const selectElement = document.getElementById('walkthrough-select');
		const infoDiv = document.getElementById('walkthrough-info');
		const descriptionP = document.getElementById('walkthrough-description');
		const exitButton = document.getElementById('exit-walkthrough');
		const categoryToggle = document.getElementById('category-toggle');
		const categoryDropdown = document.getElementById('category-dropdown');

		if (!selectElement || !infoDiv || !descriptionP || !exitButton) {
			console.warn('Walkthrough UI elements not found');
			return;
		}

		// Populate walkthrough options
		function populateWalkthroughs() {
			// Clear existing options except the first (default)
			selectElement.innerHTML = '<option value="">Kein Walk ausgewählt</option>';

			walkthroughData.forEach(walkthrough => {
				const option = document.createElement('option');
				option.value = walkthrough.id;
				option.textContent = walkthrough.title;
				selectElement.appendChild(option);
			});
		}

		// Activate walkthrough
		function activateWalkthrough(walkthroughId) {
			const walkthrough = walkthroughData.find(w => w.id === walkthroughId);
			if (!walkthrough) {
				console.warn('Walkthrough not found:', walkthroughId);
				return;
			}

			currentWalkthrough = walkthrough;

			// Show description and exit button
			descriptionP.textContent = walkthrough.description || '';
			infoDiv.style.display = 'block';

			// Disable category filter toggle
			if (categoryToggle) {
				categoryToggle.disabled = true;
				categoryToggle.style.opacity = '0.5';
				categoryToggle.style.cursor = 'not-allowed';
			}

			// Close category dropdown if open
			if (categoryDropdown) {
				categoryDropdown.style.display = 'none';
			}

			// Update markers to show only walkthrough POIs
			updateMarkers();

			// Zoom map to fit all walkthrough POIs
			zoomToWalkthroughPOIs(walkthrough.pois);

			// Draw arrows connecting the POIs
			drawWalkthroughArrows(walkthrough.pois);

			console.log('Walkthrough activated:', walkthrough.title);
		}

		// Deactivate walkthrough
		function deactivateWalkthrough() {
			currentWalkthrough = null;

			// Hide description and exit button
			infoDiv.style.display = 'none';

			// Re-enable category filter toggle
			if (categoryToggle) {
				categoryToggle.disabled = false;
				categoryToggle.style.opacity = '1';
				categoryToggle.style.cursor = 'pointer';
			}

			// Clear walkthrough arrows
			clearWalkthroughArrows();

			// Reset select to default
			selectElement.value = '';

			// Update markers to show filtered POIs
			updateMarkers();

			console.log('Walkthrough deactivated');
		}

		// Handle select change
		selectElement.addEventListener('change', (e) => {
			const walkthroughId = e.target.value;
			if (walkthroughId) {
				activateWalkthrough(walkthroughId);
			} else {
				deactivateWalkthrough();
			}
		});

		// Handle exit button
		exitButton.addEventListener('click', () => {
			deactivateWalkthrough();
		});

		// Initial population
		populateWalkthroughs();
	}

	// Handle browser back/forward buttons
	window.addEventListener('popstate', (event) => {
		const graetzlSlug = getGraetzlSlugFromPath();
		if (graetzlSlug) {
			const graetzl = findGraetzlBySlug(graetzlData, graetzlSlug);
			if (graetzl) {
				selectGraetzl(graetzl);
			}
		} else {
			selectGraetzl(null);
		}
	});

	// Setup POI search
	setupPOISearch();

	initialize();
});
