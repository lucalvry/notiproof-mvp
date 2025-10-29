/**
 * Connector Factory Pattern
 * Creates appropriate connector instances based on integration type
 */

export type ConnectorType = 'webhook' | 'api_poll' | 'oauth' | 'embed' | 'zapier_proxy';

export interface ConnectorConfig {
  integrationType: string;
  connectorType: ConnectorType;
  requiresOauth: boolean;
  webhookUrl?: string;
  apiCredentials?: Record<string, string>;
  pollingInterval?: number;
}

export interface EventData {
  eventType: string;
  eventData: Record<string, any>;
  userName?: string;
  userLocation?: string;
  messageTemplate: string;
  source: string;
}

/**
 * Base connector interface
 */
export interface IConnector {
  process(payload: any): Promise<EventData[]>;
  validate(payload: any): boolean;
}

/**
 * Webhook-based connector
 * For integrations like Stripe, Shopify, WordPress, etc.
 */
export class WebhookConnector implements IConnector {
  constructor(private integrationType: string) {}

  async process(payload: any): Promise<EventData[]> {
    // Generic webhook processing
    // Each specific integration can override this behavior
    const events: EventData[] = [];

    // Extract common fields
    const eventType = this.extractEventType(payload);
    const userName = this.extractUserName(payload);
    const userLocation = this.extractLocation(payload);
    const messageTemplate = this.generateMessage(payload);

    events.push({
      eventType,
      eventData: payload,
      userName,
      userLocation,
      messageTemplate,
      source: this.integrationType,
    });

    return events;
  }

  validate(payload: any): boolean {
    return payload && typeof payload === 'object';
  }

  private extractEventType(payload: any): string {
    // Common patterns for event type extraction
    return payload.event_type || payload.type || payload.event || 'activity';
  }

  private extractUserName(payload: any): string | undefined {
    return payload.user?.name || 
           payload.customer?.name || 
           payload.name || 
           payload.email?.split('@')[0];
  }

  private extractLocation(payload: any): string | undefined {
    if (payload.user?.location) return payload.user.location;
    if (payload.customer?.address) {
      const addr = payload.customer.address;
      return `${addr.city || ''}${addr.city && addr.country ? ', ' : ''}${addr.country || ''}`.trim();
    }
    return undefined;
  }

  private generateMessage(payload: any): string {
    const userName = this.extractUserName(payload);
    const userPrefix = userName ? `${userName} ` : 'Someone ';
    
    // Generate message based on event type
    const eventType = this.extractEventType(payload);
    
    const messageMap: Record<string, string> = {
      'form_submission': `${userPrefix}just submitted a form`,
      'purchase': `${userPrefix}just made a purchase`,
      'signup': `${userPrefix}just signed up`,
      'enrollment': `${userPrefix}just enrolled`,
      'order_create': `${userPrefix}just placed an order`,
      'payment': `${userPrefix}just made a payment`,
      'donation': `${userPrefix}just donated`,
      'booking': `${userPrefix}just made a booking`,
      'subscription': `${userPrefix}just subscribed`,
    };

    return messageMap[eventType] || `${userPrefix}performed an action`;
  }
}

/**
 * Polling-based connector
 * For integrations like Instagram, Twitter, RSS
 */
export class PollingConnector implements IConnector {
  constructor(
    private integrationType: string,
    private pollingInterval: number = 60
  ) {}

  async process(payload: any): Promise<EventData[]> {
    // Polling connectors typically fetch data from APIs
    // This is called periodically by cron jobs
    throw new Error('Polling connectors must implement custom fetch logic');
  }

  validate(payload: any): boolean {
    return true; // Polling connectors validate during fetch
  }
}

/**
 * OAuth-based connector
 * For integrations like Google, Intercom, Mailchimp
 */
export class OAuthConnector implements IConnector {
  constructor(private integrationType: string) {}

  async process(payload: any): Promise<EventData[]> {
    // OAuth connectors use authenticated API calls
    throw new Error('OAuth connectors must implement custom API logic');
  }

  validate(payload: any): boolean {
    return payload && typeof payload === 'object';
  }
}

/**
 * Webhook endpoint routing map
 * Maps integration types to their webhook handler functions
 */
export const WEBHOOK_ENDPOINT_MAP: Record<string, string> = {
  'typeform': 'webhook-typeform',
  'calendly': 'webhook-calendly',
  'shopify': 'webhook-shopify',
  'stripe': 'webhook-stripe',
  'woocommerce': 'webhook-woocommerce',
  
  // Phase 1 - Use generic handler
  'wordpress': 'webhook-generic',
  'webflow': 'webhook-generic',
  'teachable': 'webhook-generic',
  'jotform': 'webhook-generic',
  'squarespace': 'webhook-generic',
  
  // Phase 1 - Custom handler needed
  'paypal': 'webhook-paypal',
  
  // Phase 2 - Use generic handler
  'segment': 'webhook-generic',
  'ghost': 'webhook-generic',
  'gumroad': 'webhook-generic',
  'thinkific': 'webhook-generic',
  'plaid': 'webhook-generic',
};

/**
 * Create appropriate connector based on integration type
 */
export function createConnector(config: ConnectorConfig): IConnector {
  switch (config.connectorType) {
    case 'webhook':
      return new WebhookConnector(config.integrationType);
    case 'api_poll':
      return new PollingConnector(config.integrationType, config.pollingInterval);
    case 'oauth':
      return new OAuthConnector(config.integrationType);
    default:
      throw new Error(`Unknown connector type: ${config.connectorType}`);
  }
}

/**
 * Get webhook endpoint for integration type
 */
export function getWebhookEndpoint(integrationType: string): string {
  return WEBHOOK_ENDPOINT_MAP[integrationType] || 'webhook-generic';
}
