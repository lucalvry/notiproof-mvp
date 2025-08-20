import { MessageGenerationService } from './messageGenerationService';

interface BusinessContext {
  industry: string;
  platform?: string;
  customer_type?: string;
}

interface EventWithContext {
  id: string;
  event_type: string;
  business_type?: string;
  user_name?: string;
  user_location?: string;
  message_template?: string;
  business_context?: BusinessContext;
  context_template?: string;
  event_data: any;
  created_at: string;
}

export class BusinessContextService {
  /**
   * Enhance event message using business context
   */
  static enhanceEventMessage(event: EventWithContext): string {
    // If event already has a message template, use it
    if (event.message_template) {
      return event.message_template;
    }

    // If event has business context, generate smart message
    if (event.business_type && event.business_context) {
      const messageData = this.extractMessageData(event);
      
      const context = {
        businessType: event.business_type as 'saas' | 'ecommerce' | 'services' | 'events' | 'blog' | 'marketing_agency' | 'ngo' | 'education',
        eventType: event.event_type as 'purchase' | 'signup' | 'review' | 'download' | 'subscription' | 'booking' | 'contact' | 'view' | 'conversion' | 'visitor',
        data: messageData
      };

      return MessageGenerationService.generateMessage(context);
    }

    // Fallback to event data message or generic
    return event.event_data?.message || this.generateFallbackMessage(event);
  }

  /**
   * Extract message data from event
   */
  private static extractMessageData(event: EventWithContext) {
    const { event_data, user_name, user_location } = event;
    
    return {
      name: user_name || event_data?.customer_name || event_data?.user_name,
      location: user_location || event_data?.location || event_data?.user_location,
      product: event_data?.product_name || event_data?.service,
      amount: event_data?.price || (event_data?.amount ? parseFloat(event_data.amount.replace(/[^\d.]/g, '')) : undefined),
      service: event_data?.service || event_data?.product_name,
      category: event_data?.category,
      rating: event_data?.rating,
      count: event_data?.quantity || event_data?.count,
      timeAgo: this.getTimeAgo(event.created_at)
    };
  }

  /**
   * Generate fallback message for events without business context
   */
  private static generateFallbackMessage(event: EventWithContext): string {
    const eventTypeMessages = {
      purchase: "Someone just made a purchase",
      signup: "Someone just signed up",
      review: "New customer review received",
      download: "Someone downloaded content",
      subscription: "Someone subscribed",
      booking: "New appointment booked",
      contact: "Someone reached out",
      view: "Someone is browsing",
      conversion: "Someone converted",
      visitor: "Someone visited"
    };

    return eventTypeMessages[event.event_type as keyof typeof eventTypeMessages] || "New activity detected";
  }

  /**
   * Get time ago string from timestamp
   */
  private static getTimeAgo(timestamp: string): string {
    const now = new Date();
    const eventTime = new Date(timestamp);
    const diffMs = now.getTime() - eventTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  /**
   * Configure business context for widget
   */
  static getBusinessContextConfig(businessType: string) {
    const configs = {
      ecommerce: {
        industry: 'ecommerce',
        customer_type: 'returning_customer',
        default_events: ['purchase', 'view', 'signup'],
        context_templates: {
          purchase: 'ecommerce_purchase',
          view: 'ecommerce_view',
          signup: 'ecommerce_signup'
        }
      },
      saas: {
        industry: 'saas',
        customer_type: 'trial_user',
        default_events: ['signup', 'subscription', 'conversion'],
        context_templates: {
          signup: 'saas_signup',
          subscription: 'saas_subscription',
          conversion: 'saas_conversion'
        }
      },
      services: {
        industry: 'services',
        customer_type: 'prospect',
        default_events: ['booking', 'contact', 'conversion'],
        context_templates: {
          booking: 'services_booking',
          contact: 'services_contact',
          conversion: 'services_conversion'
        }
      }
    };

    return configs[businessType as keyof typeof configs] || configs.ecommerce;
  }
}