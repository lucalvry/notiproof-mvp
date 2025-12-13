import { Settings, Webhook, Zap, ShoppingBag, CreditCard, Calendar, FileText, Instagram, Twitter, Star, Globe, Music, BookOpen, DollarSign, Users, Newspaper, Mail, MessageSquare, BarChart, Code, FormInput, Megaphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface IntegrationMetadata {
  displayName: string;
  type: string;
  description: string;
  icon: LucideIcon;
  connectorType?: 'webhook' | 'api_poll' | 'oauth' | 'embed' | 'zapier_proxy' | 'native';
  requiresOauth?: boolean;
  phase?: 1 | 2 | 3;
  popularityScore?: number; // 1-100, higher = more popular
  category: 'ecommerce' | 'forms' | 'social' | 'cms' | 'payment' | 'analytics' | 'crm' | 'email' | 'education' | 'automation' | 'content' | 'community' | 'fintech' | 'music' | 'other';
  isTrending?: boolean;
  setupComplexity?: 'easy' | 'medium' | 'hard';
  setupTime?: string; // e.g., "10 min", "30 min"
  isNative?: boolean; // Flag for native integrations (no external connection required)
}

const integrationMetadataMap: Record<string, IntegrationMetadata> = {
  form_hook: {
    displayName: "Form Capture",
    type: "native",
    description: "Capture and display real form submissions as social proof",
    icon: FormInput,
    connectorType: 'native',
    phase: 1,
    popularityScore: 100,
    category: 'forms',
    setupComplexity: 'easy',
    setupTime: '2 min',
    isNative: true,
  },
  live_visitors: {
    displayName: "Visitors Pulse",
    type: "native",
    description: "Show how many people are viewing your site right now",
    icon: Users,
    connectorType: 'native',
    phase: 1,
    popularityScore: 95,
    category: 'analytics',
    setupComplexity: 'easy',
    setupTime: '1 min',
    isNative: true,
  },
  testimonials: {
    displayName: "Testimonials",
    type: "native",
    description: "Collect and display customer testimonials",
    icon: Star,
    connectorType: 'native',
    phase: 1,
    popularityScore: 92,
    category: 'other',
    setupComplexity: 'easy',
    setupTime: '3 min',
    isNative: true,
  },
  announcements: {
    displayName: "Smart Announcements",
    type: "native",
    description: "Create scheduled promotions and announcements",
    icon: Megaphone,
    connectorType: 'native',
    phase: 1,
    popularityScore: 90,
    category: 'content',
    setupComplexity: 'easy',
    setupTime: '1 min',
    isNative: true,
  },
  webhook: {
    displayName: "Generic Webhook",
    type: "webhook",
    description: "Connect any system that can send HTTP POST requests",
    icon: Webhook,
    connectorType: 'webhook',
    phase: 1,
    popularityScore: 95,
    category: 'automation',
  },
  zapier: {
    displayName: "Zapier",
    type: "automation",
    description: "Connect 5,000+ apps with Zapier automation",
    icon: Zap,
    connectorType: 'zapier_proxy',
    phase: 1,
    popularityScore: 98,
    category: 'automation',
    isTrending: true,
  },
  typeform: {
    displayName: "Typeform",
    type: "forms",
    description: "Show notifications when forms are submitted",
    icon: FileText,
    connectorType: 'webhook',
    phase: 1,
    popularityScore: 88,
    category: 'forms',
  },
  calendly: {
    displayName: "Calendly",
    type: "scheduling",
    description: "Display notifications for new bookings",
    icon: Calendar,
    connectorType: 'webhook',
    phase: 1,
    popularityScore: 85,
    category: 'forms',
  },
  shopify: {
    displayName: "Shopify",
    type: "ecommerce",
    description: "Track purchases and cart activity from your Shopify store",
    icon: ShoppingBag,
    connectorType: 'webhook',
    phase: 1,
    popularityScore: 96,
    category: 'ecommerce',
    isTrending: true,
  },
  woocommerce: {
    displayName: "WooCommerce",
    type: "ecommerce",
    description: "Capture orders from your WooCommerce website",
    icon: ShoppingBag,
    connectorType: 'webhook',
    phase: 1,
    popularityScore: 90,
    category: 'ecommerce',
  },
  stripe: {
    displayName: "Stripe",
    type: "payment",
    description: "Monitor payments and subscriptions",
    icon: CreditCard,
    connectorType: 'webhook',
    phase: 1,
    popularityScore: 92,
    category: 'payment',
    isTrending: true,
  },
  google_reviews: {
    displayName: "Google Reviews",
    type: "social",
    description: "Display customer reviews from Google",
    icon: Star,
    connectorType: 'api_poll',
    requiresOauth: true,
    phase: 1,
    popularityScore: 82,
    category: 'social',
  },
  instagram: {
    displayName: "Instagram",
    type: "social",
    description: "Show Instagram posts and engagement",
    icon: Instagram,
    connectorType: 'api_poll',
    requiresOauth: true,
    phase: 1,
    popularityScore: 87,
    category: 'social',
    isTrending: true,
  },
  twitter: {
    displayName: "Twitter/X",
    type: "social",
    description: "Display tweets and mentions",
    icon: Twitter,
    connectorType: 'api_poll',
    requiresOauth: true,
    phase: 1,
    popularityScore: 80,
    category: 'social',
  },
  ga4: {
    displayName: "Google Analytics 4",
    type: "analytics",
    description: "Track real-time visitor activity and conversions",
    icon: Settings,
    connectorType: 'oauth',
    requiresOauth: true,
    phase: 1,
    popularityScore: 90,
    category: 'analytics',
  },
  rss: {
    displayName: "RSS Feeds",
    type: "content",
    description: "Import content from RSS/Atom feeds",
    icon: FileText,
    connectorType: 'api_poll',
    phase: 1,
    category: 'content',
    setupComplexity: 'easy',
    setupTime: '5 min',
  },
  hubspot: {
    displayName: "HubSpot",
    type: "crm",
    description: "Sync contacts, deals, and activities from HubSpot CRM",
    icon: Settings,
    connectorType: 'oauth',
    requiresOauth: true,
    phase: 2,
    popularityScore: 84,
    category: 'crm',
  },
  wordpress: {
    displayName: "WordPress",
    type: "cms",
    description: "Capture form submissions, comments, and user signups from WordPress sites",
    icon: Globe,
    connectorType: 'webhook',
    phase: 1,
    popularityScore: 88,
    category: 'cms',
  },
  webflow: {
    displayName: "Webflow",
    type: "cms",
    description: "Track form submissions and e-commerce events from Webflow",
    icon: Globe,
    connectorType: 'webhook',
    phase: 1,
    category: 'cms',
    setupComplexity: 'easy',
    setupTime: '10 min',
  },
  paypal: {
    displayName: "PayPal",
    type: "payment",
    description: "Monitor donations, payments, and subscriptions via PayPal",
    icon: DollarSign,
    connectorType: 'webhook',
    phase: 1,
    category: 'payment',
    setupComplexity: 'easy',
    setupTime: '10 min',
  },
  teachable: {
    displayName: "Teachable",
    type: "education",
    description: "Display course enrollments and completions",
    icon: BookOpen,
    connectorType: 'webhook',
    phase: 1,
    category: 'education',
    setupComplexity: 'easy',
    setupTime: '10 min',
  },
  jotform: {
    displayName: "JotForm",
    type: "forms",
    description: "Show notifications for form submissions",
    icon: FileText,
    connectorType: 'webhook',
    phase: 1,
    category: 'forms',
    setupComplexity: 'easy',
    setupTime: '5 min',
  },
  squarespace: {
    displayName: "Squarespace",
    type: "ecommerce",
    description: "Track commerce, bookings, and form submissions",
    icon: ShoppingBag,
    connectorType: 'webhook',
    phase: 1,
    category: 'ecommerce',
    setupComplexity: 'easy',
    setupTime: '10 min',
  },
  // Phase 2: Post-MVP (Feature Complete)
  segment: {
    displayName: "Segment",
    type: "analytics",
    description: "Universal event tracking across all your tools",
    icon: BarChart,
    connectorType: 'webhook',
    phase: 2,
    category: 'analytics',
    setupComplexity: 'medium',
    setupTime: '15 min',
  },
  intercom: {
    displayName: "Intercom",
    type: "crm",
    description: "Display user signups, conversations, and support tickets",
    icon: MessageSquare,
    connectorType: 'oauth',
    requiresOauth: true,
    phase: 2,
    category: 'crm',
    setupComplexity: 'hard',
    setupTime: '40 min',
  },
  ghost: {
    displayName: "Ghost",
    type: "content",
    description: "Show new posts, memberships, and subscriptions",
    icon: Newspaper,
    connectorType: 'webhook',
    phase: 2,
    category: 'content',
    setupComplexity: 'easy',
    setupTime: '10 min',
  },
  gumroad: {
    displayName: "Gumroad",
    type: "ecommerce",
    description: "Track product sales and subscriptions",
    icon: ShoppingBag,
    connectorType: 'webhook',
    phase: 2,
    category: 'ecommerce',
    setupComplexity: 'easy',
    setupTime: '10 min',
  },
  mailchimp: {
    displayName: "Mailchimp",
    type: "email",
    description: "Display new subscribers and campaign activity",
    icon: Mail,
    connectorType: 'oauth',
    requiresOauth: true,
    phase: 2,
    category: 'email',
    setupComplexity: 'hard',
    setupTime: '35 min',
  },
  spotify: {
    displayName: "Spotify for Artists",
    type: "music",
    description: "Show stream counts and follower growth",
    icon: Music,
    connectorType: 'oauth',
    requiresOauth: true,
    phase: 2,
    category: 'music',
    setupComplexity: 'hard',
    setupTime: '40 min',
  },
  thinkific: {
    displayName: "Thinkific",
    type: "education",
    description: "Display course enrollments and student activity",
    icon: BookOpen,
    connectorType: 'webhook',
    phase: 2,
    category: 'education',
    setupComplexity: 'easy',
    setupTime: '10 min',
  },
  plaid: {
    displayName: "Plaid",
    type: "fintech",
    description: "Track account connections and transaction events",
    icon: DollarSign,
    connectorType: 'webhook',
    phase: 2,
    category: 'fintech',
    setupComplexity: 'hard',
    setupTime: '45 min',
  },
  // Phase 3: Market Expansion
  razorpay: {
    displayName: "Razorpay",
    type: "payment",
    description: "Monitor payments and subscriptions (India market)",
    icon: DollarSign,
    connectorType: 'webhook',
    phase: 3,
    category: 'payment',
    setupComplexity: 'easy',
    setupTime: '10 min',
  },
  flutterwave: {
    displayName: "Flutterwave",
    type: "payment",
    description: "Track payments across Africa",
    icon: DollarSign,
    connectorType: 'webhook',
    phase: 3,
    category: 'payment',
    setupComplexity: 'easy',
    setupTime: '10 min',
  },
  salesforce: {
    displayName: "Salesforce NPSP",
    type: "crm",
    description: "Enterprise nonprofit donor management",
    icon: Users,
    connectorType: 'oauth',
    requiresOauth: true,
    phase: 3,
    category: 'crm',
    setupComplexity: 'hard',
    setupTime: '60 min',
  },
  mixpanel: {
    displayName: "Mixpanel",
    type: "analytics",
    description: "Advanced product analytics and user events",
    icon: BarChart,
    connectorType: 'webhook',
    phase: 3,
    category: 'analytics',
    setupComplexity: 'medium',
    setupTime: '15 min',
  },
  circle: {
    displayName: "Circle",
    type: "community",
    description: "Display community member activity and engagement",
    icon: Users,
    connectorType: 'webhook',
    phase: 3,
    category: 'community',
    setupComplexity: 'medium',
    setupTime: '20 min',
  },
  learndash: {
    displayName: "LearnDash",
    type: "education",
    description: "WordPress LMS course enrollments and completions",
    icon: BookOpen,
    connectorType: 'webhook',
    phase: 3,
    category: 'education',
    setupComplexity: 'medium',
    setupTime: '15 min',
  },
  soundcloud: {
    displayName: "SoundCloud",
    type: "music",
    description: "Show track plays, likes, and comments",
    icon: Music,
    connectorType: 'api_poll',
    requiresOauth: true,
    phase: 3,
    category: 'music',
    setupComplexity: 'medium',
    setupTime: '30 min',
  },
  substack: {
    displayName: "Substack",
    type: "content",
    description: "Display new subscribers and post analytics",
    icon: Newspaper,
    connectorType: 'api_poll',
    phase: 3,
    category: 'content',
    setupComplexity: 'medium',
    setupTime: '25 min',
  },
  beehiiv: {
    displayName: "Beehiiv",
    type: "email",
    description: "Newsletter subscriptions and engagement",
    icon: Mail,
    connectorType: 'webhook',
    phase: 3,
    category: 'email',
    setupComplexity: 'easy',
    setupTime: '10 min',
  },
  convertkit: {
    displayName: "ConvertKit",
    type: "email",
    description: "Email marketing automation and subscriber activity",
    icon: Mail,
    connectorType: 'webhook',
    phase: 3,
    category: 'email',
    setupComplexity: 'easy',
    setupTime: '10 min',
  },
  framer: {
    displayName: "Framer",
    type: "cms",
    description: "Track form submissions and site interactions",
    icon: Code,
    connectorType: 'webhook',
    phase: 3,
    category: 'cms',
    setupComplexity: 'medium',
    setupTime: '15 min',
  },
};

export function getIntegrationMetadata(integrationType: string): IntegrationMetadata {
  return integrationMetadataMap[integrationType] || {
    displayName: integrationType.charAt(0).toUpperCase() + integrationType.slice(1),
    type: "other",
    description: `Integration for ${integrationType}`,
    icon: Settings,
    category: 'other',
  };
}

export function getIntegrationDisplayName(integrationType: string): string {
  return getIntegrationMetadata(integrationType).displayName;
}

export function getIntegrationType(integrationType: string): string {
  return getIntegrationMetadata(integrationType).type;
}

export function getIntegrationDescription(integrationType: string): string {
  return getIntegrationMetadata(integrationType).description;
}

export function getIntegrationIcon(integrationType: string): LucideIcon {
  return getIntegrationMetadata(integrationType).icon;
}

export function normalizeIntegrationKey(displayName: string): string {
  // Convert display names to database keys
  const keyMap: Record<string, string> = {
    'generic_webhook': 'webhook',
    'twitter_x': 'twitter',
    'google_analytics_4': 'ga4',
    'google_reviews': 'google_reviews',
    'twitter/x': 'twitter',
  };
  
  const transformed = displayName.toLowerCase().replace(/\s+/g, '_').replace(/\//g, '_');
  return keyMap[transformed] || transformed;
}

export function getIntegrationKeyFromDisplay(displayName: string): string {
  return normalizeIntegrationKey(displayName);
}

export function getAllIntegrations(): Array<IntegrationMetadata & { key: string }> {
  return Object.entries(integrationMetadataMap).map(([key, metadata]) => ({
    ...metadata,
    key,
  }));
}

export function inferCampaignType(dataSource: string): string {
  const metadata = getIntegrationMetadata(dataSource);
  
  const categoryToCampaignType: Record<string, string> = {
    'ecommerce': 'recent-purchase',
    'forms': 'contact-form',
    'payment': 'recent-purchase',
    'social': 'social-shares',
    'email': 'newsletter-signups',
    'analytics': 'visitor-counter',
    'crm': 'new-signup',
    'education': 'course-enrollment',
    'content': 'content-downloads',
    'automation': 'custom-event',
    'cms': 'content-downloads',
    'community': 'community-joins',
    'fintech': 'account-signup',
    'music': 'social-shares',
  };
  
  return categoryToCampaignType[metadata.category] || 'custom-event';
}
