/**
 * Campaign Type to Data Source Mapping
 * Defines which data sources (integrations) are relevant for each campaign type
 */

export const CAMPAIGN_DATA_SOURCE_MAP: Record<string, string[]> = {
  // ========== E-COMMERCE (8 types) ==========
  'recent-purchase': ['shopify', 'woocommerce', 'stripe', 'webhook', 'manual', 'csv'],
  'cart-additions': ['shopify', 'woocommerce', 'webhook', 'manual'],
  'product-reviews': ['shopify', 'woocommerce', 'google_reviews', 'trustpilot', 'webhook', 'manual'],
  'low-stock': ['shopify', 'woocommerce', 'webhook', 'manual'],
  'visitor-counter': ['ga4', 'mixpanel', 'webhook', 'manual'],
  'recently-viewed': ['ga4', 'shopify', 'woocommerce', 'webhook', 'manual'],
  'wishlist-additions': ['shopify', 'woocommerce', 'webhook', 'manual'],
  'flash-sale': ['manual', 'webhook'],

  // ========== SAAS/SOFTWARE (5 types) ==========
  'new-signup': ['webhook', 'zapier', 'stripe', 'auth0', 'manual'],
  'trial-starts': ['webhook', 'stripe', 'manual'],
  'upgrade-events': ['stripe', 'webhook', 'manual'],
  'feature-releases': ['manual'],
  'user-milestones': ['webhook', 'manual'],

  // ========== SERVICES/BOOKING (4 types) ==========
  'new-bookings': ['calendly', 'acuity', 'webhook', 'typeform', 'jotform', 'manual'],
  'service-requests': ['typeform', 'jotform', 'webhook', 'manual'],
  'appointments': ['calendly', 'acuity', 'webhook', 'manual'],
  'contact-form': ['typeform', 'jotform', 'gravity_forms', 'webhook', 'manual'],

  // ========== CONTENT/MEDIA (3 types) ==========
  'newsletter-signups': ['mailchimp', 'convertkit', 'beehiiv', 'substack', 'webhook', 'manual'],
  'content-downloads': ['webhook', 'manual'],
  'blog-comments': ['wordpress', 'ghost', 'webhook', 'manual'],

  // ========== SOCIAL/COMMUNITY (3 types) ==========
  'social-shares': ['webhook', 'manual'],
  'community-joins': ['webhook', 'manual'],
  'custom-event': ['webhook', 'zapier', 'api', 'manual'],

  // ========== NGO & NON-PROFIT (3 types) ==========
  'donation-notification': ['stripe', 'paypal', 'paystack', 'flutterwave', 'webhook', 'manual'],
  'impact-milestone': ['manual', 'webhook'],
  'volunteer-signup': ['typeform', 'jotform', 'webhook', 'manual'],

  // ========== FINANCE & FINTECH (3 types) ==========
  'account-signup': ['webhook', 'manual'],
  'transaction-volume': ['stripe', 'paypal', 'webhook', 'manual'],
  'security-trust': ['manual'],

  // ========== EDUCATION (3 types) ==========
  'course-enrollment': ['stripe', 'teachable', 'thinkific', 'webhook', 'manual'],
  'completion-milestone': ['webhook', 'manual'],
  'live-students': ['ga4', 'webhook', 'manual'],

  // ========== ADDITIONAL TYPES ==========
  'breaking-news': ['rss', 'webhook', 'manual'],
  'trending-article': ['ga4', 'webhook', 'manual'],
  'live-readers': ['ga4', 'webhook', 'manual'],
  'portfolio-showcase': ['manual'],
  'event-booking': ['calendly', 'eventbrite', 'webhook', 'manual'],
  'stream-listener': ['spotify', 'webhook', 'manual'],

  // Fallback for unknown types
  'manual-upload': ['manual', 'csv'],
};

export function getDataSourcesForCampaignType(campaignType: string): string[] {
  return CAMPAIGN_DATA_SOURCE_MAP[campaignType] || ['webhook', 'manual'];
}

export function isDataSourceRelevant(campaignType: string, dataSource: string): boolean {
  const relevantSources = getDataSourcesForCampaignType(campaignType);
  return relevantSources.includes(dataSource);
}
