// Campaign Type to Data Source Mapping
// Defines which data sources are relevant for each campaign type

export const CAMPAIGN_DATA_SOURCE_MAP: Record<string, string[]> = {
  // E-commerce campaigns
  'recent-purchase': ['shopify', 'woocommerce', 'stripe', 'webhook', 'manual'],
  'low-stock': ['shopify', 'woocommerce', 'webhook', 'manual'],
  'visitor-counter': ['ga4', 'webhook', 'manual'],
  'cart-activity': ['shopify', 'woocommerce', 'webhook', 'manual'],
  
  // SaaS campaigns
  'new-signup': ['webhook', 'zapier', 'stripe', 'manual'],
  'milestone': ['manual', 'webhook'],
  'testimonial': ['google_reviews', 'trustpilot', 'manual'],
  'live-visitors': ['ga4', 'webhook', 'manual'],
  
  // Music & Photography
  'portfolio-showcase': ['manual'],
  'event-booking': ['calendly', 'webhook', 'manual'],
  'stream-listener': ['webhook', 'manual'],
  
  // News & Media
  'breaking-news': ['rss', 'webhook', 'manual'],
  'trending-article': ['ga4', 'webhook', 'manual'],
  'live-readers': ['ga4', 'webhook', 'manual'],
  
  // NGO campaigns
  'donation-notification': ['stripe', 'paystack', 'flutterwave', 'webhook', 'manual'],
  'impact-milestone': ['manual', 'webhook'],
  'volunteer-signup': ['webhook', 'typeform', 'wpforms', 'manual'],
  
  // Finance campaigns
  'account-signup': ['webhook', 'manual'],
  'transaction-volume': ['stripe', 'paystack', 'webhook', 'manual'],
  'security-trust': ['manual'],
  
  // Education campaigns
  'course-enrollment': ['stripe', 'webhook', 'manual'],
  'completion-milestone': ['webhook', 'manual'],
  'live-students': ['ga4', 'webhook', 'manual'],
  
  // Generic
  'custom-event': ['webhook', 'zapier', 'api', 'manual'],
  'manual-upload': ['manual'],
  'social-proof': ['google_reviews', 'trustpilot', 'manual'],
};

export function getDataSourcesForCampaignType(campaignType: string): string[] {
  return CAMPAIGN_DATA_SOURCE_MAP[campaignType] || ['webhook', 'manual'];
}

export function isDataSourceRelevant(campaignType: string, dataSource: string): boolean {
  const relevantSources = getDataSourcesForCampaignType(campaignType);
  return relevantSources.includes(dataSource);
}
