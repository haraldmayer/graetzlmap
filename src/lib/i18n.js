/**
 * Internationalization utilities
 */

// Current language (default: German)
let currentLanguage = 'de';

// Get current language from localStorage or browser
export function initLanguage() {
	// Try to get from localStorage first
	const savedLang = localStorage.getItem('graetzlmap-language');
	if (savedLang === 'de' || savedLang === 'en') {
		currentLanguage = savedLang;
		return;
	}

	// Otherwise, detect from browser
	const browserLang = navigator.language.split('-')[0];
	currentLanguage = (browserLang === 'de' || browserLang === 'en') ? browserLang : 'de';
	localStorage.setItem('graetzlmap-language', currentLanguage);
}

// Get current language
export function getCurrentLanguage() {
	return currentLanguage;
}

// Set current language
export function setLanguage(lang) {
	if (lang === 'de' || lang === 'en') {
		currentLanguage = lang;
		localStorage.setItem('graetzlmap-language', lang);
		// Dispatch event for UI updates
		window.dispatchEvent(new CustomEvent('languagechange', { detail: { language: lang } }));
	}
}

// Get translated text from multilingual object or string
export function getTranslated(textObj) {
	if (!textObj) return '';
	if (typeof textObj === 'string') return textObj;
	if (typeof textObj === 'object') {
		return textObj[currentLanguage] || textObj.de || textObj.en || '';
	}
	return '';
}

// UI translations
export const translations = {
	// Navigation
	nav: {
		list: { de: 'Liste', en: 'List' },
		walkthrough: { de: 'Grätzlwalk', en: 'Neighborhood Walk' },
		selectGraetzl: { de: 'Grätzl auswählen', en: 'Select Neighborhood' },
		searchPOI: { de: 'POI suchen', en: 'Search POI' },
		filterCategories: { de: 'Kategorien filtern', en: 'Filter Categories' }
	},

	// Placeholders
	placeholder: {
		noList: { de: 'Keine Liste ausgewählt', en: 'No list selected' },
		noWalk: { de: 'Kein Walk ausgewählt', en: 'No walk selected' },
		allGraetzl: { de: 'Alle Grätzl werden angezeigt', en: 'All neighborhoods shown' },
		searchPOI: { de: 'POI nach Name suchen...', en: 'Search POI by name...' },
		searchCategories: { de: 'Kategorien suchen...', en: 'Search categories...' }
	},

	// Buttons
	button: {
		clearSelection: { de: 'Auswahl löschen', en: 'Clear selection' },
		selectAll: { de: 'Alle auswählen', en: 'Select all' },
		deselectAll: { de: 'Alle abwählen', en: 'Deselect all' },
		close: { de: 'Schließen', en: 'Close' }
	},

	// Category toggle
	category: {
		allCategories: { de: 'Alle Kategorien', en: 'All Categories' }
	},

	// Sidebar
	sidebar: {
		list: { de: 'Liste', en: 'List' },
		walkthrough: { de: 'Walk', en: 'Walk' }
	},

	// Language switcher
	language: {
		switchTo: { de: 'English', en: 'Deutsch' }
	}
};

// Helper function to translate a key path
export function t(keyPath) {
	const keys = keyPath.split('.');
	let value = translations;

	for (const key of keys) {
		value = value[key];
		if (!value) return keyPath;
	}

	return getTranslated(value);
}

export default {
	initLanguage,
	getCurrentLanguage,
	setLanguage,
	getTranslated,
	translations,
	t
};
