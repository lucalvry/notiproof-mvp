import { BaseAdapter } from '../BaseAdapter';
import { CanonicalEvent, NormalizedField } from '../types';

/**
 * Visitors Pulse Adapter
 * Native integration for showing real-time visitor counts
 */
export class LiveVisitorsAdapter extends BaseAdapter {
  provider = 'live_visitors';
  displayName = 'Visitors Pulse';
  
  /**
   * Available fields this adapter can provide
   */
  availableFields(): NormalizedField[] {
    return [
      {
        key: 'template.visitor_count',
        label: 'Visitor Count',
        type: 'number',
        description: 'Number of active visitors',
        example: 23,
        required: true,
      },
      {
        key: 'template.location',
        label: 'Location',
        type: 'string',
        description: 'Geographic location of visitors',
        example: 'United States',
      },
      {
        key: 'template.page_name',
        label: 'Page Name',
        type: 'string',
        description: 'Name of the page being viewed (clickable)',
        example: 'Products',
      },
      {
        key: 'template.page_url',
        label: 'Page URL',
        type: 'string',
        description: 'Full URL of the page being viewed (for clickable links)',
        example: '/shop/products',
      },
      {
        key: 'template.page_title',
        label: 'Page Title',
        type: 'string',
        description: 'Browser title of the page being viewed',
        example: 'Shop - Our Products',
      },
      {
        key: 'template.message',
        label: 'Message',
        type: 'string',
        description: 'Complete visitor message',
        example: '23 people are viewing this page',
      },
    ];
  }
  
  /**
   * Normalize raw event to canonical shape
   */
  normalize(rawEvent: any): CanonicalEvent {
    const count = rawEvent.native_config?.visitor_count || 0;
    const page = rawEvent.native_config?.page_name || 'this page';
    const pageUrl = rawEvent.native_config?.page_url || '';
    const pageTitle = rawEvent.native_config?.page_title || '';
    const location = rawEvent.native_config?.location;
    
    const message = `${count} ${count === 1 ? 'person is' : 'people are'} viewing ${page}`;
    
    return {
      event_id: rawEvent.id || this.generateEventId('lv'),
      provider: this.provider,
      provider_event_type: 'visitor',
      timestamp: rawEvent.created_at || new Date().toISOString(),
      payload: rawEvent,
      normalized: {
        'template.visitor_count': count,
        'template.location': location,
        'template.page_name': page,
        'template.page_url': pageUrl,
        'template.page_title': pageTitle,
        'template.message': message,
      },
    };
  }
  
  /**
   * Get sample events for testing and preview
   */
  getSampleEvents(): CanonicalEvent[] {
    return [
      {
        event_id: 'sample-lv-1',
        provider: this.provider,
        provider_event_type: 'visitor',
        timestamp: new Date().toISOString(),
        payload: {},
        normalized: {
          'template.visitor_count': 23,
          'template.location': 'United States',
          'template.page_name': 'Products',
          'template.page_url': '/shop/products',
          'template.page_title': 'Shop - Our Products',
          'template.message': '23 people are viewing Products',
        },
      },
      {
        event_id: 'sample-lv-2',
        provider: this.provider,
        provider_event_type: 'visitor',
        timestamp: new Date().toISOString(),
        payload: {},
        normalized: {
          'template.visitor_count': 12,
          'template.location': 'Canada',
          'template.page_name': 'Pricing',
          'template.page_url': '/pricing',
          'template.page_title': 'Pricing Plans',
          'template.message': '12 people are viewing Pricing',
        },
      },
      {
        event_id: 'sample-lv-3',
        provider: this.provider,
        provider_event_type: 'visitor',
        timestamp: new Date().toISOString(),
        payload: {},
        normalized: {
          'template.visitor_count': 8,
          'template.location': 'United Kingdom',
          'template.page_name': 'Checkout',
          'template.page_url': '/checkout',
          'template.page_title': 'Complete Your Order',
          'template.message': '8 people are checking out now',
        },
      },
    ];
  }
}
