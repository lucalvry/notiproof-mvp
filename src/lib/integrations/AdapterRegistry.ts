import { IntegrationAdapter } from './types';
import { ShopifyAdapter } from './adapters/ShopifyAdapter';
import { StripeAdapter } from './adapters/StripeAdapter';
import { WooCommerceAdapter } from './adapters/WooCommerceAdapter';
import { TestimonialAdapter } from './adapters/TestimonialAdapter';
import { AnnouncementAdapter } from './adapters/AnnouncementAdapter';
import { InstantCaptureAdapter } from './adapters/InstantCaptureAdapter';
import { LiveVisitorsAdapter } from './adapters/LiveVisitorsAdapter';

/**
 * Central registry for all integration adapters
 * This is the single source of truth for available adapters
 */
class AdapterRegistry {
  private adapters = new Map<string, IntegrationAdapter>();
  
  constructor() {
    // Register all adapters on initialization
    this.register(new ShopifyAdapter());
    this.register(new StripeAdapter());
    this.register(new WooCommerceAdapter());
    this.register(new TestimonialAdapter());
    this.register(new AnnouncementAdapter());
    this.register(new InstantCaptureAdapter());
    this.register(new LiveVisitorsAdapter());
  }
  
  /**
   * Register a new adapter
   */
  register(adapter: IntegrationAdapter): void {
    if (this.adapters.has(adapter.provider)) {
      console.warn(`[AdapterRegistry] Overwriting existing adapter: ${adapter.provider}`);
    }
    this.adapters.set(adapter.provider, adapter);
    console.log(`[AdapterRegistry] ✅ Registered adapter: ${adapter.displayName} (${adapter.provider})`);
  }
  
  /**
   * Get adapter by provider ID
   */
  get(provider: string): IntegrationAdapter | undefined {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      console.warn(`[AdapterRegistry] Adapter not found: ${provider}`);
    }
    return adapter;
  }
  
  /**
   * Get all registered adapters
   */
  getAll(): IntegrationAdapter[] {
    return Array.from(this.adapters.values());
  }

  getAvailableProviders(): string[] {
    return Array.from(this.adapters.keys());
  }
  
  /**
   * Get all provider IDs
   */
  getProviders(): string[] {
    return Array.from(this.adapters.keys());
  }
  
  /**
   * Check if provider has registered adapter
   */
  has(provider: string): boolean {
    return this.adapters.has(provider);
  }
  
  /**
   * Get adapters by category/type
   */
  getByCategory(category: 'ecommerce' | 'testimonial' | 'native' | 'social' | 'all'): IntegrationAdapter[] {
    const all = this.getAll();
    
    if (category === 'all') return all;
    
    const categoryMap: Record<string, string[]> = {
      ecommerce: ['shopify', 'woocommerce', 'stripe'],
      testimonial: ['testimonials'],
      native: ['announcements', 'live_visitors', 'instant_capture'],
      social: ['instagram', 'twitter'],
    };
    
    const providers = categoryMap[category] || [];
    return all.filter(adapter => providers.includes(adapter.provider));
  }
}

// Export singleton instance
export const adapterRegistry = new AdapterRegistry();

// Export for testing/extending
export { AdapterRegistry };
