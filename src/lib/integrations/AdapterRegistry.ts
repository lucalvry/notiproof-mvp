import { IntegrationAdapter } from './types';
import { ShopifyAdapter } from './adapters/ShopifyAdapter';
import { StripeAdapter } from './adapters/StripeAdapter';
import { WooCommerceAdapter } from './adapters/WooCommerceAdapter';
import { TestimonialAdapter } from './adapters/TestimonialAdapter';
import { AnnouncementAdapter } from './adapters/AnnouncementAdapter';
import { LiveVisitorsAdapter } from './adapters/LiveVisitorsAdapter';
import { FormHookAdapter } from './adapters/FormHookAdapter';

/**
 * Provider aliases to handle database inconsistencies
 * Maps legacy/alternate provider names to canonical names
 */
const PROVIDER_ALIASES: Record<string, string> = {
  instant_capture: 'form_hook',
  active_visitors: 'live_visitors',
};

/**
 * Get the canonical provider name, resolving any aliases
 */
export function resolveProviderAlias(provider: string): string {
  return PROVIDER_ALIASES[provider] || provider;
}

/**
 * Get all aliases for a provider (including the canonical name)
 */
export function getProviderAliases(provider: string): string[] {
  const canonical = resolveProviderAlias(provider);
  const aliases = Object.entries(PROVIDER_ALIASES)
    .filter(([_, value]) => value === canonical)
    .map(([key]) => key);
  return [canonical, ...aliases];
}

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
    this.register(new LiveVisitorsAdapter());
    this.register(new FormHookAdapter());
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
   * Get adapter by provider ID, resolving aliases
   */
  get(provider: string): IntegrationAdapter | undefined {
    // First try direct lookup
    let adapter = this.adapters.get(provider);
    if (adapter) return adapter;
    
    // Try resolving alias
    const canonical = resolveProviderAlias(provider);
    adapter = this.adapters.get(canonical);
    if (!adapter) {
      console.warn(`[AdapterRegistry] Adapter not found: ${provider} (tried alias: ${canonical})`);
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
   * Check if provider has registered adapter (resolves aliases)
   */
  has(provider: string): boolean {
    if (this.adapters.has(provider)) return true;
    const canonical = resolveProviderAlias(provider);
    return this.adapters.has(canonical);
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
      native: ['announcements', 'live_visitors', 'form_hook'],
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
