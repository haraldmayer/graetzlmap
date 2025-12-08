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

	// Function to get icon for category
	function getCategoryIcon(category) {
		// Fallback if categories not loaded yet
		if (!categories || Object.keys(categories).length === 0) {
			console.warn('Categories not loaded yet');
			return '📍';
		}
		const cat = categories[category];
		if (!cat) {
			console.warn(`Category "${category}" not found, using default`);
			return '📍';
		}
		// Use image if available, otherwise use emoji
		return cat.image || cat.emoji;
	}

	// Function to calculate marker size based on zoom level
	function getMarkerSize(zoom) {
		return Math.max(10, Math.min(50, 10 + (zoom - 10) * 3.33));
	}

	// Function to create custom icon
	function createCustomIcon(category, zoom) {
		const icon = getCategoryIcon(category);
		const size = getMarkerSize(zoom || map.getZoom());
		return L.divIcon({
			html: `<div class="custom-marker" style="width: ${size}px; height: ${size}px; font-size: ${size * 0.7}px; line-height: ${size}px;">${icon}</div>`,
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
		label.dataset.categoryName = categoryInfo.name.toLowerCase();

		const checkbox = document.createElement('input');
		checkbox.type = 'checkbox';
		checkbox.value = categoryId;
		checkbox.checked = true; // All selected by default
		checkbox.addEventListener('change', () => {
			updateCategorySelection();
		});

		const icon = document.createElement('span');
		icon.className = 'category-icon';
		icon.textContent = categoryInfo.emoji;

		const name = document.createElement('span');
		name.className = 'category-name';
		name.textContent = categoryInfo.name;

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

		// Build filter
		const filters = {};
		if (currentGraetzlId) {
			filters.graetzlId = parseInt(currentGraetzlId);
		}
		if (selectedCategories.size > 0) {
			filters.categories = Array.from(selectedCategories);
		}

		// Get filtered POIs using spatial query
		const poiFeatures = geoquery.filterPOIsWithGraetzl(geoData, graetzlData, filters);

		// Add markers
		poiFeatures.forEach(poiFeature => {
			const poi = poiFeature.properties;
			const coords = geoquery.featureToLeafletCoords(poiFeature);
			const icon = getCategoryIcon(poi.category);

			const marker = L.marker(coords, {
				icon: createCustomIcon(poi.category, map.getZoom())
			}).addTo(map);

			// Create popup content
			const popupContent = `
				<div class="poi-popup">
					<div class="poi-icon">${icon}</div>
					<h3>${poi.name}</h3>
					<p>${poi.description}</p>
					<a href="${poi.link}" target="_blank" class="poi-link">Mehr erfahren →</a>
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

			// Populate Grätzl dropdown
			populateGraetzlDropdown();

			// Create category filter UI
			createCategoryFilters();

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

	initialize();
});
