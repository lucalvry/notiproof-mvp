import { supabase } from '@/integrations/supabase/client';

export interface RawEvent {
  source: 'shopify' | 'woocommerce' | 'stripe' | 'google_reviews' | 'custom_sdk' | 'api' | 'form_hook' | 'javascript_api' | 'webhook';
  event_type: string;
  raw_data: any;
  widget_id: string;
}

export interface NormalizedEvent {
  widget_id: string;
  event_type: string;
  event_data: any;
  user_name?: string;
  user_email?: string;
  user_location?: string;
  message_template?: string;
  integration_type: string;
  moderation_status: 'pending' | 'approved' | 'rejected' | 'flagged';
  quality_score: number;
  business_type?: string;
  source: string;
}

export class EventNormalizationService {
  /**
   * Normalizes raw events from various sources into unified schema
   */
  static async normalizeEvent(rawEvent: RawEvent): Promise<NormalizedEvent> {
    const normalized: NormalizedEvent = {
      widget_id: rawEvent.widget_id,
      event_type: rawEvent.event_type,
      event_data: rawEvent.raw_data,
      integration_type: rawEvent.source,
      moderation_status: 'approved',
      quality_score: 50,
      source: 'natural'
    };

    // Source-specific normalization
    switch (rawEvent.source) {
      case 'shopify':
        this.normalizeShopifyEvent(rawEvent.raw_data, normalized);
        break;
      case 'woocommerce':
        this.normalizeWooCommerceEvent(rawEvent.raw_data, normalized);
        break;
      case 'stripe':
        this.normalizeStripeEvent(rawEvent.raw_data, normalized);
        break;
      case 'google_reviews':
        this.normalizeGoogleReviewEvent(rawEvent.raw_data, normalized);
        break;
      case 'custom_sdk':
        this.normalizeCustomSDKEvent(rawEvent.raw_data, normalized);
        break;
      case 'api':
        this.normalizeAPIEvent(rawEvent.raw_data, normalized);
        break;
      case 'form_hook':
        this.normalizeFormHookEvent(rawEvent.raw_data, normalized);
        break;
      case 'javascript_api':
        this.normalizeJavaScriptAPIEvent(rawEvent.raw_data, normalized);
        break;
      default:
        this.normalizeGenericEvent(rawEvent.raw_data, normalized);
    }

    // Get message template
    await this.attachMessageTemplate(normalized);
    
    // Calculate quality score
    this.calculateQualityScore(normalized);

    return normalized;
  }

  /**
   * Normalize Shopify purchase events
   */
  private static normalizeShopifyEvent(data: any, normalized: NormalizedEvent) {
    normalized.user_name = data.customer?.first_name || data.billing_address?.first_name;
    normalized.user_email = data.customer?.email || data.email;
    normalized.user_location = this.extractLocation(
      data.billing_address?.city,
      data.billing_address?.country
    );
    
    normalized.event_data = {
      ...data,
      product_name: data.line_items?.[0]?.name || 'a product',
      amount: data.total_price,
      currency: data.currency
    };
    
    normalized.business_type = 'ecommerce';
    normalized.event_type = 'purchase';
  }

  /**
   * Normalize WooCommerce order events
   */
  private static normalizeWooCommerceEvent(data: any, normalized: NormalizedEvent) {
    normalized.user_name = `${data.billing?.first_name || ''} ${data.billing?.last_name || ''}`.trim();
    normalized.user_email = data.billing?.email;
    normalized.user_location = this.extractLocation(
      data.billing?.city,
      data.billing?.country
    );
    
    normalized.event_data = {
      ...data,
      product_name: data.line_items?.[0]?.name || 'a product',
      amount: data.total,
      currency: data.currency
    };
    
    normalized.business_type = 'ecommerce';
    normalized.event_type = 'purchase';
  }

  /**
   * Normalize Stripe subscription events
   */
  private static normalizeStripeEvent(data: any, normalized: NormalizedEvent) {
    normalized.user_email = data.customer?.email || data.customer_email;
    normalized.user_name = data.customer?.name || this.extractNameFromEmail(normalized.user_email);
    
    normalized.event_data = {
      ...data,
      plan_name: data.items?.data?.[0]?.price?.nickname || 'Premium Plan',
      amount: data.items?.data?.[0]?.price?.unit_amount,
      currency: data.currency
    };
    
    normalized.business_type = 'saas';
    normalized.event_type = 'subscription';
  }

  /**
   * Normalize Google Reviews events
   */
  private static normalizeGoogleReviewEvent(data: any, normalized: NormalizedEvent) {
    normalized.user_name = data.author_name || 'Someone';
    
    normalized.event_data = {
      ...data,
      rating: data.rating,
      review_text: data.text,
      author_name: data.author_name
    };
    
    normalized.business_type = 'ecommerce';
    normalized.event_type = 'review';
  }

  /**
   * Normalize Custom SDK events
   */
  private static normalizeCustomSDKEvent(data: any, normalized: NormalizedEvent) {
    normalized.user_name = data.user_name || data.name;
    normalized.user_email = data.user_email || data.email;
    normalized.user_location = data.user_location || data.location;
    
    // Preserve all custom data
    normalized.event_data = { ...data };
  }

  /**
   * Normalize direct API events
   */
  private static normalizeAPIEvent(data: any, normalized: NormalizedEvent) {
    normalized.user_name = data.user_name || data.customer_name;
    normalized.user_email = data.user_email || data.email;
    normalized.user_location = data.user_location || data.location;
    normalized.business_type = data.business_type;
    
    normalized.event_data = { ...data };
  }

  /**
   * Normalize Form Hook events (Typeform, HubSpot, etc.)
   */
  private static normalizeFormHookEvent(data: any, normalized: NormalizedEvent) {
    // Common form field mappings
    const fieldMappings = {
      name: ['name', 'full_name', 'first_name', 'your_name'],
      email: ['email', 'email_address', 'your_email'],
      location: ['location', 'city', 'address', 'country']
    };

    normalized.user_name = this.extractFieldValue(data, fieldMappings.name);
    normalized.user_email = this.extractFieldValue(data, fieldMappings.email);
    normalized.user_location = this.extractFieldValue(data, fieldMappings.location);
    
    normalized.event_data = {
      ...data,
      form_name: data.form_name || 'Contact Form'
    };
    
    normalized.event_type = 'form_submission';
  }

  /**
   * Normalize JavaScript API events
   */
  private static normalizeJavaScriptAPIEvent(data: any, normalized: NormalizedEvent) {
    normalized.user_name = data.user_name;
    normalized.user_email = data.user_email;
    normalized.user_location = data.user_location || data.location;
    
    normalized.event_data = { ...data };
  }

  /**
   * Generic fallback normalization
   */
  private static normalizeGenericEvent(data: any, normalized: NormalizedEvent) {
    normalized.user_name = data.user_name || data.name || data.customer_name;
    normalized.user_email = data.user_email || data.email;
    normalized.user_location = data.user_location || data.location;
    
    normalized.event_data = { ...data };
  }

  /**
   * Attach appropriate message template based on event type and business type
   */
  private static async attachMessageTemplate(normalized: NormalizedEvent) {
    try {
      const { data: templates } = await supabase
        .from('event_templates')
        .select('template')
        .eq('event_type', normalized.event_type)
        .eq('integration_type', normalized.integration_type as any)
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .limit(1);

      if (templates && templates.length > 0) {
        normalized.message_template = templates[0].template;
      } else {
        // Fallback template
        normalized.message_template = this.generateFallbackTemplate(normalized);
      }
    } catch (error) {
      console.error('Error fetching message template:', error);
      normalized.message_template = this.generateFallbackTemplate(normalized);
    }
  }

  /**
   * Generate fallback message template
   */
  private static generateFallbackTemplate(normalized: NormalizedEvent): string {
    const name = normalized.user_name ? `{user_name}` : 'Someone';
    const location = normalized.user_location ? ` from {user_location}` : '';
    
    switch (normalized.event_type) {
      case 'purchase':
        return `${name}${location} just made a purchase`;
      case 'subscription':
        return `${name}${location} just subscribed`;
      case 'review':
        return `${name} left a review`;
      case 'signup':
        return `${name}${location} just signed up`;
      case 'form_submission':
        return `${name}${location} submitted a form`;
      case 'newsletter_signup':
        return `${name}${location} subscribed to the newsletter`;
      case 'download':
        return `${name}${location} downloaded a resource`;
      default:
        return `${name}${location} just took an action`;
    }
  }

  /**
   * Calculate quality score based on data richness
   */
  private static calculateQualityScore(normalized: NormalizedEvent) {
    let score = 0;
    
    // Base score
    score += 20;
    
    // Name available
    if (normalized.user_name && normalized.user_name !== 'Someone') score += 20;
    
    // Email available
    if (normalized.user_email) score += 15;
    
    // Location available
    if (normalized.user_location) score += 15;
    
    // Rich event data
    if (Object.keys(normalized.event_data).length > 3) score += 10;
    
    // Recent event (assume all normalized events are recent)
    score += 20;
    
    normalized.quality_score = Math.min(score, 100);
  }

  /**
   * Utility: Extract location from city/country
   */
  private static extractLocation(city?: string, country?: string): string | undefined {
    if (city && country) return `${city}, ${country}`;
    if (city) return city;
    if (country) return country;
    return undefined;
  }

  /**
   * Utility: Extract name from email
   */
  private static extractNameFromEmail(email?: string): string | undefined {
    if (!email) return undefined;
    const localPart = email.split('@')[0];
    return localPart.replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Utility: Extract field value using multiple possible field names
   */
  private static extractFieldValue(data: any, possibleFields: string[]): string | undefined {
    for (const field of possibleFields) {
      if (data[field]) return data[field];
    }
    return undefined;
  }

  /**
   * Store normalized event in database
   */
  static async storeNormalizedEvent(normalized: NormalizedEvent) {
    try {
      const { error } = await supabase
        .from('events')
        .insert({
          widget_id: normalized.widget_id,
          event_type: normalized.event_type,
          event_data: normalized.event_data,
          user_name: normalized.user_name,
          user_email: normalized.user_email,
          user_location: normalized.user_location,
          message_template: normalized.message_template,
          integration_type: normalized.integration_type as any,
          moderation_status: normalized.moderation_status as any,
          quality_score: normalized.quality_score,
          business_type: normalized.business_type as any,
          source: normalized.source as any,
          views: 0,
          clicks: 0
        });

      if (error) {
        console.error('Error storing normalized event:', error);
        throw error;
      }

      console.log('Successfully stored normalized event');
    } catch (error) {
      console.error('Failed to store normalized event:', error);
      throw error;
    }
  }
}