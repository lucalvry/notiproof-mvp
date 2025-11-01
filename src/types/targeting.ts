/**
 * Targeting Rules Type Definitions
 * Complete targeting system as specified in PRD
 */

export interface TargetingRules {
  url_rules: {
    include_urls: string[];  // ['/product/*', '/checkout']
    exclude_urls: string[];  // ['/admin/*']
  };
  countries: {
    include: string[];  // ['US', 'GB', 'CA']
    exclude: string[];
  };
  devices: ('desktop' | 'mobile' | 'tablet')[];
  traffic_sources: {
    include_referrers: string[];
    exclude_referrers: string[];
  };
  behavior: {
    min_time_on_page_seconds?: number;
    min_scroll_depth_percent?: number;
    trigger_on_exit_intent?: boolean;
    show_to_returning_visitors?: boolean;
  };
  schedule: {
    timezone: string;
    active_days: number[]; // [0-6] Sunday=0, Saturday=6
    active_hours: { start: string; end: string }[];
  };
  // Display settings
  display: {
    initial_delay_ms?: number;
    display_duration_ms?: number;
    interval_ms?: number;
    max_per_page?: number;
    max_per_session?: number;
  };
}

export const DEFAULT_TARGETING_RULES: TargetingRules = {
  url_rules: {
    include_urls: [],
    exclude_urls: [],
  },
  countries: {
    include: [],
    exclude: [],
  },
  devices: ['desktop', 'mobile', 'tablet'],
  traffic_sources: {
    include_referrers: [],
    exclude_referrers: [],
  },
  behavior: {
    min_time_on_page_seconds: 0,
    min_scroll_depth_percent: 0,
    trigger_on_exit_intent: false,
    show_to_returning_visitors: true,
  },
  schedule: {
    timezone: 'UTC',
    active_days: [0, 1, 2, 3, 4, 5, 6],
    active_hours: [],
  },
  display: {
    initial_delay_ms: 0,
    display_duration_ms: 5000,
    interval_ms: 8000,
    max_per_page: 5,
    max_per_session: 20,
  },
};

// Common country codes
export const COUNTRY_OPTIONS = [
  { value: 'US', label: '🇺🇸 United States' },
  { value: 'GB', label: '🇬🇧 United Kingdom' },
  { value: 'CA', label: '🇨🇦 Canada' },
  { value: 'AU', label: '🇦🇺 Australia' },
  { value: 'DE', label: '🇩🇪 Germany' },
  { value: 'FR', label: '🇫🇷 France' },
  { value: 'ES', label: '🇪🇸 Spain' },
  { value: 'IT', label: '🇮🇹 Italy' },
  { value: 'NL', label: '🇳🇱 Netherlands' },
  { value: 'SE', label: '🇸🇪 Sweden' },
  { value: 'NO', label: '🇳🇴 Norway' },
  { value: 'DK', label: '🇩🇰 Denmark' },
  { value: 'FI', label: '🇫🇮 Finland' },
  { value: 'BE', label: '🇧🇪 Belgium' },
  { value: 'CH', label: '🇨🇭 Switzerland' },
  { value: 'AT', label: '🇦🇹 Austria' },
  { value: 'IE', label: '🇮🇪 Ireland' },
  { value: 'NZ', label: '🇳🇿 New Zealand' },
  { value: 'SG', label: '🇸🇬 Singapore' },
  { value: 'JP', label: '🇯🇵 Japan' },
  { value: 'KR', label: '🇰🇷 South Korea' },
  { value: 'IN', label: '🇮🇳 India' },
  { value: 'BR', label: '🇧🇷 Brazil' },
  { value: 'MX', label: '🇲🇽 Mexico' },
  { value: 'AR', label: '🇦🇷 Argentina' },
  { value: 'CL', label: '🇨🇱 Chile' },
  { value: 'CO', label: '🇨🇴 Colombia' },
  { value: 'ZA', label: '🇿🇦 South Africa' },
  { value: 'NG', label: '🇳🇬 Nigeria' },
  { value: 'KE', label: '🇰🇪 Kenya' },
  { value: 'EG', label: '🇪🇬 Egypt' },
];

// Timezone options
export const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris, Berlin, Rome' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Australia/Sydney', label: 'Sydney' },
];

// Day names for schedule
export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
