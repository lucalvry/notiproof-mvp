/**
 * Verification Badge Utility
 * Determines when to show "✓ NotiProof Verified" badge
 */

export interface VerificationBadgeOptions {
  isSimulated?: boolean;
  visitorsPulseMode?: 'real' | 'simulated';
  isDemo?: boolean;
}

/**
 * Determines whether to show the "✓ NotiProof Verified" badge
 * based on provider type and data source
 * 
 * Rules:
 * - Shopify, Stripe, WooCommerce, Testimonials, Form Hook: Always show (real customer data)
 * - Live Visitors (Visitors Pulse): Only show when mode === 'real'
 * - Announcements: Never show (business-created content, not customer actions)
 * - Simulated/Demo data: Never show
 */
export function shouldShowVerificationBadge(
  provider: string,
  options?: VerificationBadgeOptions
): boolean {
  // Never show for explicitly simulated/demo data
  if (options?.isSimulated || options?.isDemo) {
    return false;
  }

  // Normalize provider name
  const normalizedProvider = provider?.toLowerCase().replace(/[_-]/g, '');

  // Never show for announcements (business-created content)
  if (normalizedProvider === 'announcements') {
    return false;
  }

  // Visitors Pulse / Live Visitors: only show for real mode
  if (normalizedProvider === 'livevisitors' || normalizedProvider === 'visitorspulse') {
    return options?.visitorsPulseMode === 'real';
  }

  // Show for all real data providers
  const verifiedProviders = [
    'shopify',
    'stripe',
    'woocommerce',
    'testimonials',
    'formhook',
  ];

  return verifiedProviders.includes(normalizedProvider);
}

/**
 * Get the verification badge text
 */
export const VERIFICATION_BADGE_TEXT = '✓ NotiProof Verified';

/**
 * Provider verification configuration for reference
 */
export const PROVIDER_VERIFICATION_CONFIG: Record<string, { showBadge: boolean | 'conditional'; description: string }> = {
  shopify: { showBadge: true, description: 'Real purchase/order data' },
  stripe: { showBadge: true, description: 'Real payment events' },
  woocommerce: { showBadge: true, description: 'Real purchase data' },
  testimonials: { showBadge: true, description: 'Real customer testimonials' },
  form_hook: { showBadge: true, description: 'Real form submissions' },
  live_visitors: { showBadge: 'conditional', description: 'Only when mode is "real"' },
  announcements: { showBadge: false, description: 'Business-created content' },
};
