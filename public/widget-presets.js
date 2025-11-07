// NotiProof Widget Presets - Emoji-based fallback icons for product images
// This provides lightweight, zero-dependency fallback icons when product images are unavailable

const NOTIPROOF_PRESETS = {
  // E-commerce categories
  fashion: '👗',
  clothing: '👕',
  electronics: '💻',
  jewelry: '💍',
  books: '📚',
  food: '🍕',
  sports: '⚽',
  beauty: '💄',
  cosmetics: '💄',
  home: '🏠',
  furniture: '🛋️',
  toys: '🧸',
  automotive: '🚗',
  health: '💊',
  pets: '🐕',
  music: '🎵',
  art: '🎨',
  shoes: '👟',
  watches: '⌚',
  bags: '👜',
  
  // SaaS actions
  signup: '🎉',
  trial: '🚀',
  upgrade: '⭐',
  demo: '📅',
  subscription: '💳',
  feature: '✨',
  
  // Generic fallbacks
  purchase: '🛍️',
  cart: '🛒',
  heart: '❤️',
  fire: '🔥',
  star: '⭐',
  gift: '🎁',
  trophy: '🏆',
  rocket: '🚀',
  sparkles: '✨',
  default: '📦'
};

/**
 * Get preset emoji icon for a product category
 * @param {string} category - Product category (e.g., 'electronics', 'fashion')
 * @returns {string} Emoji character
 */
function getPresetImage(category) {
  if (!category) return NOTIPROOF_PRESETS.default;
  
  // Normalize category: lowercase and remove special characters
  const normalized = String(category).toLowerCase().trim();
  
  // Direct match
  if (NOTIPROOF_PRESETS[normalized]) {
    return NOTIPROOF_PRESETS[normalized];
  }
  
  // Partial match (e.g., "women's fashion" -> fashion)
  for (const key in NOTIPROOF_PRESETS) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return NOTIPROOF_PRESETS[key];
    }
  }
  
  return NOTIPROOF_PRESETS.default;
}

// Export for widget use
if (typeof window !== 'undefined') {
  window.getPresetImage = getPresetImage;
  window.NOTIPROOF_PRESETS = NOTIPROOF_PRESETS;
}
