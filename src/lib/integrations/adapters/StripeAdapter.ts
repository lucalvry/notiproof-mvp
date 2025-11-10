import { BaseIntegrationAdapter } from '../BaseAdapter';
import { NormalizedEvent, FetchOptions } from '../IntegrationAdapter';
import { supabase } from '@/integrations/supabase/client';

export class StripeAdapter extends BaseIntegrationAdapter {
  id = 'stripe';
  displayName = 'Stripe';
  type = 'external' as const;
  
  async fetchEvents(connectorId: string, options?: FetchOptions): Promise<NormalizedEvent[]> {
    const query = supabase
      .from('events')
      .select('*')
      .eq('integration_type', 'stripe')
      .eq('source', 'connector')
      .order('created_at', { ascending: false })
      .limit(options?.limit || 50);
    
    if (options?.since) {
      query.gte('created_at', options.since.toISOString());
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return (data || []).map(event => this.normalizeEvent(event));
  }
  
  normalizeEvent(rawEvent: any): NormalizedEvent {
    const eventData = rawEvent.event_data || {};
    
    return {
      id: rawEvent.id,
      source: 'stripe',
      event_type: rawEvent.event_type || 'payment',
      timestamp: new Date(rawEvent.created_at),
      message: rawEvent.message_template || `${eventData.customer_name || 'Someone'} completed a payment of ${eventData.amount || '$0'}`,
      user_name: eventData.customer_name || rawEvent.user_name,
      user_email: eventData.customer_email,
      user_location: eventData.customer_location || rawEvent.user_location,
      metadata: {
        amount: eventData.amount,
        currency: eventData.currency,
        payment_id: eventData.payment_id,
        subscription_id: eventData.subscription_id,
        plan_name: eventData.plan_name,
      },
      external_id: eventData.payment_id,
      raw_data: rawEvent,
    };
  }
  
  getTemplateFields(): string[] {
    return [
      'user_name',
      'user_location',
      'amount',
      'currency',
      'payment_id',
      'plan_name',
    ];
  }
  
  getSampleEvent(): NormalizedEvent {
    return {
      id: 'sample-stripe-1',
      source: 'stripe',
      event_type: 'payment',
      timestamp: new Date(),
      message: 'John from London just subscribed to Pro Plan',
      user_name: 'John Davis',
      user_location: 'London, UK',
      user_avatar: 'https://i.pravatar.cc/150?img=2',
      metadata: {
        amount: '$49.99',
        currency: 'USD',
        payment_id: 'pi_1234567890',
        plan_name: 'Pro Plan',
      },
      external_id: 'pi_1234567890',
      raw_data: {},
    };
  }
  
  getSyncConfig() {
    return {
      supportsWebhook: true,
      supportsPolling: false,
      defaultInterval: 0,
      maxEventsPerSync: 100,
    };
  }
}
