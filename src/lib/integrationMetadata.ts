import { Settings, Webhook, Zap, ShoppingBag, CreditCard, Calendar, FileText, Instagram, Twitter, Star, Globe, Music, BookOpen, DollarSign, Users, Newspaper, Mail, MessageSquare, BarChart, Code } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface IntegrationMetadata {
  displayName: string;
  type: string;
  description: string;
  icon: LucideIcon;
  connectorType?: 'webhook' | 'api_poll' | 'oauth' | 'embed' | 'zapier_proxy';
  requiresOauth?: boolean;
  phase?: 1 | 2 | 3;
}

const integrationMetadataMap: Record<string, IntegrationMetadata> = {
  webhook: {
    displayName: "Generic Webhook",
    type: "webhook",
    description: "Connect any system that can send HTTP POST requests",
    icon: Webhook,
    connectorType: 'webhook',
    phase: 1,
  },
  zapier: {
    displayName: "Zapier",
    type: "automation",
    description: "Connect 5,000+ apps with Zapier automation",
    icon: Zap,
    connectorType: 'zapier_proxy',
    phase: 1,
  },
  typeform: {
    displayName: "Typeform",
    type: "forms",
    description: "Show notifications when forms are submitted",
    icon: FileText,
    connectorType: 'webhook',
    phase: 1,
  },
  calendly: {
    displayName: "Calendly",
    type: "scheduling",
    description: "Display notifications for new bookings",
    icon: Calendar,
    connectorType: 'webhook',
    phase: 1,
  },
  shopify: {
    displayName: "Shopify",
    type: "ecommerce",
    description: "Track purchases and cart activity from your Shopify store",
    icon: ShoppingBag,
    connectorType: 'webhook',
    phase: 1,
  },
  woocommerce: {
    displayName: "WooCommerce",
    type: "ecommerce",
    description: "Capture orders from your WooCommerce website",
    icon: ShoppingBag,
    connectorType: 'webhook',
    phase: 1,
  },
  stripe: {
    displayName: "Stripe",
    type: "payment",
    description: "Monitor payments and subscriptions",
    icon: CreditCard,
    connectorType: 'webhook',
    phase: 1,
  },
  google_reviews: {
    displayName: "Google Reviews",
    type: "social",
    description: "Display customer reviews from Google",
    icon: Star,
    connectorType: 'api_poll',
    requiresOauth: true,
    phase: 1,
  },
  instagram: {
    displayName: "Instagram",
    type: "social",
    description: "Show Instagram posts and engagement",
    icon: Instagram,
    connectorType: 'api_poll',
    requiresOauth: true,
    phase: 1,
  },
  twitter: {
    displayName: "Twitter/X",
    type: "social",
    description: "Display tweets and mentions",
    icon: Twitter,
    connectorType: 'api_poll',
    requiresOauth: true,
    phase: 1,
  },
  ga4: {
    displayName: "Google Analytics 4",
    type: "analytics",
    description: "Track real-time visitor activity and conversions",
    icon: Settings,
    connectorType: 'oauth',
    requiresOauth: true,
    phase: 1,
  },
  rss: {
    displayName: "RSS Feeds",
    type: "content",
    description: "Import content from RSS/Atom feeds",
    icon: FileText,
    connectorType: 'api_poll',
    phase: 1,
  },
  hubspot: {
    displayName: "HubSpot",
    type: "crm",
    description: "Sync contacts, deals, and activities from HubSpot CRM",
    icon: Settings,
    connectorType: 'oauth',
    requiresOauth: true,
    phase: 2,
  },
  // Phase 1: Pre-MVP (Launch Blockers)
  wordpress: {
    displayName: "WordPress",
    type: "cms",
    description: "Capture form submissions, comments, and user signups from WordPress sites",
    icon: Globe,
    connectorType: 'webhook',
    phase: 1,
  },
  webflow: {
    displayName: "Webflow",
    type: "cms",
    description: "Track form submissions and e-commerce events from Webflow",
    icon: Globe,
    connectorType: 'webhook',
    phase: 1,
  },
  paypal: {
    displayName: "PayPal",
    type: "payment",
    description: "Monitor donations, payments, and subscriptions via PayPal",
    icon: DollarSign,
    connectorType: 'webhook',
    phase: 1,
  },
  teachable: {
    displayName: "Teachable",
    type: "education",
    description: "Display course enrollments and completions",
    icon: BookOpen,
    connectorType: 'webhook',
    phase: 1,
  },
  jotform: {
    displayName: "JotForm",
    type: "forms",
    description: "Show notifications for form submissions",
    icon: FileText,
    connectorType: 'webhook',
    phase: 1,
  },
  squarespace: {
    displayName: "Squarespace",
    type: "ecommerce",
    description: "Track commerce, bookings, and form submissions",
    icon: ShoppingBag,
    connectorType: 'webhook',
    phase: 1,
  },
  // Phase 2: Post-MVP (Feature Complete)
  segment: {
    displayName: "Segment",
    type: "analytics",
    description: "Universal event tracking across all your tools",
    icon: BarChart,
    connectorType: 'webhook',
    phase: 2,
  },
  intercom: {
    displayName: "Intercom",
    type: "crm",
    description: "Display user signups, conversations, and support tickets",
    icon: MessageSquare,
    connectorType: 'oauth',
    requiresOauth: true,
    phase: 2,
  },
  ghost: {
    displayName: "Ghost",
    type: "content",
    description: "Show new posts, memberships, and subscriptions",
    icon: Newspaper,
    connectorType: 'webhook',
    phase: 2,
  },
  gumroad: {
    displayName: "Gumroad",
    type: "ecommerce",
    description: "Track product sales and subscriptions",
    icon: ShoppingBag,
    connectorType: 'webhook',
    phase: 2,
  },
  mailchimp: {
    displayName: "Mailchimp",
    type: "email",
    description: "Display new subscribers and campaign activity",
    icon: Mail,
    connectorType: 'oauth',
    requiresOauth: true,
    phase: 2,
  },
  spotify: {
    displayName: "Spotify for Artists",
    type: "music",
    description: "Show stream counts and follower growth",
    icon: Music,
    connectorType: 'oauth',
    requiresOauth: true,
    phase: 2,
  },
  thinkific: {
    displayName: "Thinkific",
    type: "education",
    description: "Display course enrollments and student activity",
    icon: BookOpen,
    connectorType: 'webhook',
    phase: 2,
  },
  plaid: {
    displayName: "Plaid",
    type: "fintech",
    description: "Track account connections and transaction events",
    icon: DollarSign,
    connectorType: 'webhook',
    phase: 2,
  },
  // Phase 3: Market Expansion
  razorpay: {
    displayName: "Razorpay",
    type: "payment",
    description: "Monitor payments and subscriptions (India market)",
    icon: DollarSign,
    connectorType: 'webhook',
    phase: 3,
  },
  flutterwave: {
    displayName: "Flutterwave",
    type: "payment",
    description: "Track payments across Africa",
    icon: DollarSign,
    connectorType: 'webhook',
    phase: 3,
  },
  salesforce: {
    displayName: "Salesforce NPSP",
    type: "crm",
    description: "Enterprise nonprofit donor management",
    icon: Users,
    connectorType: 'oauth',
    requiresOauth: true,
    phase: 3,
  },
  mixpanel: {
    displayName: "Mixpanel",
    type: "analytics",
    description: "Advanced product analytics and user events",
    icon: BarChart,
    connectorType: 'webhook',
    phase: 3,
  },
  circle: {
    displayName: "Circle",
    type: "community",
    description: "Display community member activity and engagement",
    icon: Users,
    connectorType: 'webhook',
    phase: 3,
  },
  learndash: {
    displayName: "LearnDash",
    type: "education",
    description: "WordPress LMS course enrollments and completions",
    icon: BookOpen,
    connectorType: 'webhook',
    phase: 3,
  },
  soundcloud: {
    displayName: "SoundCloud",
    type: "music",
    description: "Show track plays, likes, and comments",
    icon: Music,
    connectorType: 'api_poll',
    requiresOauth: true,
    phase: 3,
  },
  substack: {
    displayName: "Substack",
    type: "content",
    description: "Display new subscribers and post analytics",
    icon: Newspaper,
    connectorType: 'api_poll',
    phase: 3,
  },
  beehiiv: {
    displayName: "Beehiiv",
    type: "email",
    description: "Newsletter subscriptions and engagement",
    icon: Mail,
    connectorType: 'webhook',
    phase: 3,
  },
  convertkit: {
    displayName: "ConvertKit",
    type: "email",
    description: "Email marketing automation and subscriber activity",
    icon: Mail,
    connectorType: 'webhook',
    phase: 3,
  },
  framer: {
    displayName: "Framer",
    type: "cms",
    description: "Track form submissions and site interactions",
    icon: Code,
    connectorType: 'webhook',
    phase: 3,
  },
};

export function getIntegrationMetadata(integrationType: string): IntegrationMetadata {
  return integrationMetadataMap[integrationType] || {
    displayName: integrationType.charAt(0).toUpperCase() + integrationType.slice(1),
    type: "other",
    description: `Integration for ${integrationType}`,
    icon: Settings,
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
