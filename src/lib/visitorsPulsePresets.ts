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

// Destination page preset for quick-add
export interface DestinationPagePreset {
  name: string;
  url: string;
  icon: string;
}

export const DESTINATION_PAGE_PRESETS: DestinationPagePreset[] = [
  { name: 'Pricing Plans', url: '/pricing', icon: '💰' },
  { name: 'Products', url: '/products', icon: '🛍️' },
  { name: 'Sign Up', url: '/signup', icon: '✍️' },
  { name: 'Blog', url: '/blog', icon: '📝' },
  { name: 'Features', url: '/features', icon: '⭐' },
  { name: 'Demo', url: '/demo', icon: '🎥' },
  { name: 'Checkout', url: '/checkout', icon: '🛒' },
  { name: 'Free Trial', url: '/trial', icon: '🎁' },
];

// Destination page config stored per campaign
export interface DestinationPage {
  id: string;
  name: string;
  url: string;
  message_override?: string;
  enabled: boolean;
}

// Conversion-focused message templates using {{country}}, {{page_name}}, {{time_ago}}, {{count}}
export const MESSAGE_PRESETS: Record<UrgencyLevel, string[]> = {
  informational: [
    'Someone from {{country}} viewed {{page_name}} {{time_ago}}',
    '{{count}} visitors checked out {{page_name}} recently',
    'A visitor from {{country}} browsed {{page_name}}',
  ],
  social_proof: [
    'Someone from {{country}} just viewed {{page_name}}',
    '{{count}} people viewed {{page_name}} in the last hour',
    'A visitor from {{country}} is viewing {{page_name}} right now',
    'Join {{count}} others who checked out {{page_name}}',
  ],
  fomo: [
    '🔥 Someone from {{country}} just viewed {{page_name}}!',
    '{{count}} people checked out {{page_name}} in the last 30 mins',
    'Trending: {{page_name}} — {{count}} visitors right now!',
    'Don\'t miss out — {{count}} people viewing {{page_name}}',
  ],
  scarcity: [
    '🔥 {{count}} people viewing {{page_name}} right now!',
    'Hot! Someone from {{country}} just viewed {{page_name}}',
    '⚡ {{page_name}} is trending — {{count}} visitors!',
    'Hurry! {{count}} people interested in {{page_name}}',
  ],
};

// Page-specific message presets (legacy, kept for backward compat)
export const PAGE_PRESETS: Record<string, { label: string; messages: string[] }> = {
  pricing: {
    label: 'Pricing Page',
    messages: [
      '{{count}} comparing pricing plans',
      '{{count}} people evaluating options',
    ],
  },
  checkout: {
    label: 'Checkout',
    messages: [
      '{{count}} completing their purchase',
      '{{count}} shoppers checking out now',
    ],
  },
  product: {
    label: 'Product Page',
    messages: [
      '{{count}} looking at this item',
      '{{count}} interested in this product',
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

// Curated country pool for simulated mode (weighted by likelihood)
export const SIMULATED_COUNTRIES = [
  'United States', 'United States', 'United States', // 3x weight
  'United Kingdom', 'United Kingdom',
  'Canada', 'Canada',
  'Germany', 'Germany',
  'France',
  'Australia',
  'Netherlands',
  'Brazil',
  'India',
  'Japan',
  'Spain',
  'Italy',
  'Sweden',
  'Mexico',
  'Singapore',
  'South Korea',
];

// Time ago strings with weights (60% just now, 25% 2 min, 15% 5 min)
export const TIME_AGO_OPTIONS = [
  'just now', 'just now', 'just now', 'just now', 'just now', 'just now',
  '2 minutes ago', '2 minutes ago', '2 minutes ago',
  '5 minutes ago',
  '3 minutes ago',
];

// Get suggested icon based on urgency level
export function getSuggestedIcon(urgency: UrgencyLevel): string {
  return URGENCY_LEVELS.find(u => u.id === urgency)?.icon || '👥';
}

// Get message suggestions based on urgency
export function getMessageSuggestions(urgency: UrgencyLevel, pageType?: string): string[] {
  return MESSAGE_PRESETS[urgency] || MESSAGE_PRESETS.social_proof;
}

// Detect page type from URL pattern
export function detectPageType(urlPattern: string): string | null {
  const lowerPattern = urlPattern.toLowerCase();
  if (lowerPattern.includes('pricing') || lowerPattern.includes('plans')) return 'pricing';
  if (lowerPattern.includes('checkout') || lowerPattern.includes('payment')) return 'checkout';
  if (lowerPattern.includes('product') || lowerPattern.includes('item')) return 'product';
  return null;
}

// Generate a unique ID for page rules / destination pages
export function generateRuleId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
