import { BaseIntegrationAdapter } from '../BaseAdapter';
import { NormalizedEvent, FetchOptions } from '../IntegrationAdapter';
import { supabase } from '@/integrations/supabase/client';

export class ShopifyAdapter extends BaseIntegrationAdapter {
  id = 'shopify';
  displayName = 'Shopify';
  type = 'external' as const;
  
  async fetchEvents(connectorId: string, options?: FetchOptions): Promise<NormalizedEvent[]> {
    // Fetch from events table filtered by connector
    const query = supabase
      .from('events')
      .select('*')
      .eq('integration_type', 'shopify')
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
      source: 'shopify',
      event_type: rawEvent.event_type || 'purchase',
      timestamp: new Date(rawEvent.created_at),
      message: rawEvent.message_template || `${eventData.customer_name || 'Someone'} purchased ${eventData.product_name || 'a product'}`,
      user_name: eventData.customer_name || rawEvent.user_name,
      user_email: eventData.customer_email,
      user_location: eventData.customer_location || rawEvent.user_location,
      user_avatar: eventData.customer_avatar,
      image_url: eventData.product_image,
      metadata: {
        product_name: eventData.product_name,
        product_price: eventData.product_price,
        order_id: eventData.order_id,
        order_total: eventData.order_total,
      },
      external_id: eventData.order_id,
      raw_data: rawEvent,
    };
  }
  
  getTemplateFields(): string[] {
    return [
      'user_name',
      'user_location',
      'product_name',
      'product_price',
      'order_total',
      'order_id',
    ];
  }
  
  getSampleEvent(): NormalizedEvent {
    return {
      id: 'sample-shopify-1',
      source: 'shopify',
      event_type: 'purchase',
      timestamp: new Date(),
      message: 'Sarah from New York just purchased Premium Sneakers',
      user_name: 'Sarah Johnson',
      user_location: 'New York, NY',
      user_avatar: 'https://i.pravatar.cc/150?img=1',
      image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
      metadata: {
        product_name: 'Premium Sneakers',
        product_price: '$129.99',
        order_total: '$129.99',
        order_id: 'SHP-12345',
      },
      external_id: 'SHP-12345',
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
