/**
 * Unified Integration System
 * 
 * This is the canonical integration layer that powers all campaigns.
 * All campaigns, templates, and data sources go through this unified interface.
 */

export * from './types';
export * from './BaseAdapter';
export * from './AdapterRegistry';

// Re-export adapters
export { ShopifyAdapter } from './adapters/ShopifyAdapter';
export { StripeAdapter } from './adapters/StripeAdapter';
export { WooCommerceAdapter } from './adapters/WooCommerceAdapter';
export { TestimonialAdapter } from './adapters/TestimonialAdapter';
export { AnnouncementAdapter } from './adapters/AnnouncementAdapter';
export { InstantCaptureAdapter } from './adapters/InstantCaptureAdapter';
export { LiveVisitorsAdapter } from './adapters/LiveVisitorsAdapter';

// Export singleton registry
export { adapterRegistry } from './AdapterRegistry';
