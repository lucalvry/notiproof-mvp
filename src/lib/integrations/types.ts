/**
 * Canonical Event Shape - ALL adapters must output this structure
 * This is consumed by the template engine
 */
export interface CanonicalEvent {
  event_id: string;
  provider: string;
  provider_event_type: string;
  timestamp: string; // ISO 8601
  payload: Record<string, any>; // Raw provider payload
  normalized: {
    // Template-ready fields - keys match template.required_fields
    [key: string]: any;
  };
}

/**
 * Integration Adapter Interface
 * Each provider (Shopify, Stripe, Testimonials, etc.) implements this
 */
export interface IntegrationAdapter {
  provider: string;
  displayName: string;
  
  /**
   * Connect to the integration (OAuth, API key, etc.)
   */
  connect(credentials: Record<string, any>): Promise<ConnectionResult>;
  
  /**
   * List all available normalized field keys this adapter can provide
   * Used by template mapping UI
   */
  availableFields(): NormalizedField[];
  
  /**
   * Normalize a raw provider event to canonical shape
   */
  normalize(rawEvent: any): CanonicalEvent;
  
  /**
   * Provide sample events for testing and preview
   */
  getSampleEvents(): CanonicalEvent[];
  
  /**
   * Validate event authenticity (webhook signatures, etc.)
   */
  validateEvent?(rawEvent: any, signature?: string, secret?: string): boolean;
  
  /**
   * Test connection health
   */
  testConnection?(credentials: Record<string, any>): Promise<TestResult>;
}

export interface ConnectionResult {
  success: boolean;
  integration_id?: string;
  credentials?: Record<string, any>;
  error?: string;
}

export interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

export interface NormalizedField {
  key: string; // e.g., 'template.product_name'
  label: string; // e.g., 'Product Name'
  type: 'string' | 'number' | 'boolean' | 'date' | 'currency' | 'url' | 'image';
  description?: string;
  example?: any;
  required?: boolean;
}

/**
 * Template Configuration
 */
export interface TemplateConfig {
  id: string;
  provider: string;
  template_key: string;
  name: string;
  style_variant: 'compact' | 'card' | 'toast' | 'hero' | 'carousel' | 'video';
  category: string;
  required_fields: string[]; // Must be normalized field keys
  html_template: string;
  preview_json: Record<string, any>;
}

/**
 * Campaign Data Source Configuration
 */
export interface CampaignDataSource {
  integration_id: string;
  provider: string;
  adapter_config?: Record<string, any>;
  filters?: {
    event_types?: string[];
    min_rating?: number;
    max_age_hours?: number;
    verified_only?: boolean;
    [key: string]: any;
  };
}
