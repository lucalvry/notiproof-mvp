/**
 * Campaign Type Recommendation Engine
 * Suggests the best campaign types based on business type
 */

import { BusinessType } from './businessTypes';

export interface CampaignRecommendation {
  campaignTypeId: string;
  score: number; // 1-100, higher = better match
  reason: string;
  isPrimary?: boolean; // Mark as top 3 recommendations
}

/**
 * Campaign type to business type mapping with priority scores
 * Higher score = better match for that business type
 */
const CAMPAIGN_BUSINESS_MATCH_MATRIX: Record<string, Partial<Record<BusinessType, number>>> = {
  // E-commerce campaigns
  'recent-purchase': {
    ecommerce: 100,
    retail: 95,
    food_beverage: 70,
  },
  'cart-additions': {
    ecommerce: 95,
    retail: 90,
  },
  'product-reviews': {
    ecommerce: 90,
    retail: 85,
    services: 75,
    hospitality: 80,
    beauty: 75,
  },
  'low-stock': {
    ecommerce: 85,
    retail: 90,
  },
  'visitor-counter': {
    ecommerce: 80,
    saas: 85,
    blog: 70,
    media: 75,
    real_estate: 60,
  },
  'recently-viewed': {
    ecommerce: 75,
    retail: 70,
    real_estate: 65,
  },
  'wishlist-additions': {
    ecommerce: 70,
    retail: 65,
  },
  'flash-sale': {
    ecommerce: 85,
    retail: 80,
  },

  // SaaS campaigns
  'new-signup': {
    saas: 100,
    services: 90,
    education: 85,
    blog: 75,
    consulting: 80,
    marketing_agency: 85,
  },
  'trial-starts': {
    saas: 95,
    technology: 80,
  },
  'upgrade-events': {
    saas: 90,
    education: 70,
  },
  'feature-releases': {
    saas: 85,
    technology: 80,
  },
  'user-milestones': {
    saas: 80,
    education: 85,
    fitness: 75,
  },

  // Services campaigns
  'new-bookings': {
    services: 95,
    consulting: 95,
    healthcare: 100,
    beauty: 100,
    fitness: 95,
    hospitality: 90,
    travel: 90,
  },
  'service-requests': {
    services: 90,
    consulting: 90,
    real_estate: 95,
    automotive: 85,
    legal: 90,
  },
  'appointments': {
    services: 95,
    healthcare: 100,
    consulting: 90,
    beauty: 95,
    fitness: 90,
  },
  'contact-form': {
    services: 85,
    real_estate: 90,
    marketing_agency: 85,
    consulting: 80,
    automotive: 75,
  },

  // Content campaigns
  'newsletter-signups': {
    blog: 100,
    media: 95,
    saas: 70,
    education: 75,
  },
  'content-downloads': {
    blog: 90,
    media: 85,
    education: 90,
    marketing_agency: 80,
  },
  'blog-comments': {
    blog: 95,
    media: 90,
  },

  // Social campaigns
  'social-shares': {
    blog: 85,
    media: 90,
    saas: 65,
  },
  'community-joins': {
    saas: 80,
    blog: 75,
    education: 85,
  },
  'custom-event': {
    ecommerce: 50,
    saas: 50,
    services: 50,
    blog: 50,
    education: 50,
  },

  // NGO campaigns
  'donation-notification': {
    ngo: 100,
  },
  'impact-milestone': {
    ngo: 95,
  },
  'volunteer-signup': {
    ngo: 95,
  },

  // Education campaigns
  'course-enrollment': {
    education: 100,
  },
  'completion-milestone': {
    education: 95,
  },
};

/**
 * Recommendation reasons based on business type and campaign type
 */
const RECOMMENDATION_REASONS: Record<string, Partial<Record<BusinessType, string>>> = {
  'recent-purchase': {
    ecommerce: 'Perfect for showing real-time purchase activity',
    retail: 'Build trust by displaying recent sales',
  },
  'new-signup': {
    saas: 'Showcase growing user base to build credibility',
    services: 'Display new client acquisitions',
    education: 'Show enrollment activity',
  },
  'new-bookings': {
    services: 'Highlight service demand and availability',
    healthcare: 'Show appointment activity to reduce anxiety',
    beauty: 'Create urgency with booking notifications',
  },
  'visitor-counter': {
    ecommerce: 'Create FOMO by showing current interest',
    saas: 'Demonstrate product popularity',
  },
  'low-stock': {
    ecommerce: 'Drive urgency with inventory scarcity',
    retail: 'Encourage immediate purchases',
  },
  'newsletter-signups': {
    blog: 'Grow your subscriber base with social proof',
    media: 'Show content popularity',
  },
  'donation-notification': {
    ngo: 'Inspire giving by showing donor activity',
  },
  'course-enrollment': {
    education: 'Show course popularity to drive enrollments',
  },
};

/**
 * Get recommended campaign types for a business
 */
export function getRecommendedCampaigns(businessType: BusinessType): CampaignRecommendation[] {
  const recommendations: CampaignRecommendation[] = [];

  // Iterate through all campaign types
  Object.entries(CAMPAIGN_BUSINESS_MATCH_MATRIX).forEach(([campaignTypeId, businessMatches]) => {
    const score = businessMatches[businessType];
    
    if (score && score > 0) {
      const reason = RECOMMENDATION_REASONS[campaignTypeId]?.[businessType] 
        || 'Good fit for your business type';
      
      recommendations.push({
        campaignTypeId,
        score,
        reason,
      });
    }
  });

  // Sort by score (highest first)
  recommendations.sort((a, b) => b.score - a.score);

  // Mark top 3 as primary recommendations
  recommendations.slice(0, 3).forEach(rec => {
    rec.isPrimary = true;
  });

  return recommendations;
}

/**
 * Get top N recommended campaigns
 */
export function getTopRecommendedCampaigns(
  businessType: BusinessType,
  count: number = 3
): CampaignRecommendation[] {
  return getRecommendedCampaigns(businessType).slice(0, count);
}

/**
 * Check if campaign type is recommended for business
 */
export function isCampaignRecommended(
  campaignTypeId: string,
  businessType: BusinessType
): boolean {
  const score = CAMPAIGN_BUSINESS_MATCH_MATRIX[campaignTypeId]?.[businessType];
  return score !== undefined && score >= 60; // Threshold: 60+
}

/**
 * Get recommendation score for specific campaign-business combo
 */
export function getRecommendationScore(
  campaignTypeId: string,
  businessType: BusinessType
): number {
  return CAMPAIGN_BUSINESS_MATCH_MATRIX[campaignTypeId]?.[businessType] || 0;
}

/**
 * Get recommendation reason for specific campaign-business combo
 */
export function getRecommendationReason(
  campaignTypeId: string,
  businessType: BusinessType
): string {
  return RECOMMENDATION_REASONS[campaignTypeId]?.[businessType] 
    || 'Recommended for your business type';
}
