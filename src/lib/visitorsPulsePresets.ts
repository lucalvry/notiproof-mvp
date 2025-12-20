// Urgency levels for Visitors Pulse notifications
export type UrgencyLevel = 'informational' | 'social_proof' | 'fomo' | 'scarcity';

export interface UrgencyConfig {
  id: UrgencyLevel;
  name: string;
  description: string;
  icon: string;
  colorClass: string;
  animation?: string;
}

export const URGENCY_LEVELS: UrgencyConfig[] = [
  { 
    id: 'informational', 
    name: 'Informational', 
    description: 'Neutral visitor count display',
    icon: '👀',
    colorClass: 'from-blue-500/20 to-blue-600/30'
  },
  { 
    id: 'social_proof', 
    name: 'Social Proof', 
    description: 'Build trust by showing others are interested',
    icon: '👥',
    colorClass: 'from-green-500/20 to-green-600/30'
  },
  { 
    id: 'fomo', 
    name: 'FOMO', 
    description: 'Create urgency - fear of missing out',
    icon: '⏰',
    colorClass: 'from-orange-500/20 to-orange-600/30',
    animation: 'pulse'
  },
  { 
    id: 'scarcity', 
    name: 'Scarcity', 
    description: 'Maximum urgency - limited availability',
    icon: '🔥',
    colorClass: 'from-red-500/30 to-red-600/40',
    animation: 'pulse'
  },
];

// Message presets organized by urgency level - with time context for better UX
export const MESSAGE_PRESETS: Record<UrgencyLevel, string[]> = {
  informational: [
    '{{count}} visitors in the last hour',
    '{{count}} people viewing this page now',
    '{{count}} active readers right now',
  ],
  social_proof: [
    '{{count}} people viewed this in the last hour',
    '{{count}} visitors are here right now',
    '{{count}} others exploring this page',
    'Join {{count}} people browsing now',
  ],
  fomo: [
    '{{count}} people just viewed this!',
    '{{count}} visitors in the last 30 mins',
    'Trending: {{count}} viewing now!',
    '⏰ {{count}} others looking right now',
    'Popular! {{count}} people interested',
  ],
  scarcity: [
    '🔥 {{count}} people checking this out!',
    '{{count}} active shoppers right now',
    'Hot! {{count}} viewing this moment',
    '⚡ {{count}} people watching - act fast!',
    'Hurry! {{count}} interested right now',
  ],
};

// Page-specific message presets
export const PAGE_PRESETS: Record<string, { label: string; messages: string[] }> = {
  pricing: {
    label: 'Pricing Page',
    messages: [
      '{{count}} comparing pricing plans',
      '{{count}} people evaluating options',
      '{{count}} considering an upgrade',
    ],
  },
  checkout: {
    label: 'Checkout',
    messages: [
      '{{count}} completing their purchase',
      '{{count}} shoppers checking out now',
      '{{count}} in checkout - don\'t miss out!',
    ],
  },
  product: {
    label: 'Product Page',
    messages: [
      '{{count}} looking at this item',
      '{{count}} interested in this product',
      '{{count}} people have this in their sights',
    ],
  },
  cart: {
    label: 'Cart',
    messages: [
      '{{count}} people have items in cart',
      '{{count}} ready to complete their order',
    ],
  },
  landing: {
    label: 'Landing Page',
    messages: [
      '{{count}} exploring right now',
      '{{count}} visitors discovering this',
    ],
  },
};

// Page rule interface
export interface PageRule {
  id: string;
  urlPattern: string;
  messageTemplate: string;
  icon: string;
  urgencyLevel: UrgencyLevel;
  enabled: boolean;
}

// Default excluded pages where notifications don't make sense
export const DEFAULT_EXCLUDED_PAGES = [
  '/contact',
  '/support',
  '/help',
  '/privacy',
  '/terms',
  '/legal',
  '/dashboard',
  '/account',
  '/settings',
  '/login',
  '/signup',
  '/register',
];

// Icon options organized by urgency
export const ICON_OPTIONS: Record<UrgencyLevel, string[]> = {
  informational: ['👀', '📊', '📈', '💡', '🔍'],
  social_proof: ['👥', '🤝', '✨', '💫', '🌟'],
  fomo: ['⏰', '⚡', '🎯', '🔔', '⏱️'],
  scarcity: ['🔥', '💥', '🚀', '⚠️', '🏃'],
};

// Get suggested icon based on urgency level
export function getSuggestedIcon(urgency: UrgencyLevel): string {
  return URGENCY_LEVELS.find(u => u.id === urgency)?.icon || '👥';
}

// Get message suggestions based on urgency and optional page type
export function getMessageSuggestions(urgency: UrgencyLevel, pageType?: string): string[] {
  const urgencyMessages = MESSAGE_PRESETS[urgency] || MESSAGE_PRESETS.social_proof;
  
  if (pageType && PAGE_PRESETS[pageType]) {
    return [...PAGE_PRESETS[pageType].messages, ...urgencyMessages];
  }
  
  return urgencyMessages;
}

// Detect page type from URL pattern
export function detectPageType(urlPattern: string): string | null {
  const lowerPattern = urlPattern.toLowerCase();
  
  if (lowerPattern.includes('pricing') || lowerPattern.includes('plans')) return 'pricing';
  if (lowerPattern.includes('checkout') || lowerPattern.includes('payment')) return 'checkout';
  if (lowerPattern.includes('product') || lowerPattern.includes('item')) return 'product';
  if (lowerPattern.includes('cart') || lowerPattern.includes('basket')) return 'cart';
  if (lowerPattern === '/' || lowerPattern.includes('landing')) return 'landing';
  
  return null;
}

// Generate a unique ID for page rules
export function generateRuleId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
