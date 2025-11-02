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
  'flash-sale': ['shopify', 'woocommerce', 'stripe', 'webhook', 'manual'],

  // ========== SAAS/SOFTWARE (5 types) ==========
  'new-signup': ['webhook', 'zapier', 'stripe', 'auth0', 'manual'],
  'trial-starts': ['webhook', 'stripe', 'manual'],
  'upgrade-events': ['stripe', 'webhook', 'manual'],
  'feature-releases': ['webhook', 'zapier', 'manual'],
  'user-milestones': ['webhook', 'zapier', 'segment', 'mixpanel', 'manual'],
  'testimonial': ['typeform', 'jotform', 'trustpilot', 'webhook', 'manual'],

  // ========== SERVICES/BOOKING (4 types) ==========
  'new-bookings': ['calendly', 'acuity', 'webhook', 'typeform', 'jotform', 'manual'],
  'service-requests': ['typeform', 'jotform', 'webhook', 'manual'],
  'appointments': ['calendly', 'acuity', 'webhook', 'manual'],
  'contact-form': ['typeform', 'jotform', 'gravity_forms', 'webhook', 'manual'],

  // ========== CONTENT/MEDIA (3 types) ==========
  'newsletter-signups': ['mailchimp', 'convertkit', 'beehiiv', 'substack', 'webhook', 'manual'],
  'content-downloads': ['wordpress', 'webflow', 'webhook', 'manual'],
  'blog-comments': ['wordpress', 'ghost', 'webhook', 'manual'],
  
  // ========== SOCIAL/COMMUNITY (3 types) ==========
  'social-shares': ['instagram', 'twitter', 'zapier', 'webhook', 'manual'],
  'community-joins': ['circle', 'webhook', 'zapier', 'manual'],
  'custom-event': ['webhook', 'zapier', 'api', 'manual'],

  // ========== NGO & NON-PROFIT (3 types) ==========
  'donation-notification': ['stripe', 'paypal', 'paystack', 'flutterwave', 'webhook', 'manual'],
  'impact-milestone': ['webhook', 'zapier', 'manual'],
  'volunteer-signup': ['typeform', 'jotform', 'webhook', 'manual'],

  // ========== FINANCE & FINTECH (3 types) ==========
  'account-signup': ['webhook', 'zapier', 'plaid', 'manual'],
  'transaction-volume': ['stripe', 'paypal', 'plaid', 'webhook', 'manual'],
  'security-trust': ['manual', 'webhook'],

  // ========== EDUCATION (3 types) ==========
  'course-enrollment': ['stripe', 'teachable', 'thinkific', 'webhook', 'manual'],
  'completion-milestone': ['teachable', 'thinkific', 'webhook', 'zapier', 'manual'],
  'live-students': ['ga4', 'webhook', 'manual'],

  // ========== ADDITIONAL TYPES ==========
  'breaking-news': ['rss', 'wordpress', 'ghost', 'webhook', 'manual'],
  'trending-article': ['ga4', 'wordpress', 'ghost', 'webhook', 'manual'],
  'live-readers': ['ga4', 'mixpanel', 'webhook', 'manual'],
  'portfolio-showcase': ['instagram', 'webhook', 'manual'],
  'event-booking': ['calendly', 'eventbrite', 'webhook', 'manual'],
  'stream-listener': ['spotify', 'soundcloud', 'webhook', 'manual'],

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
