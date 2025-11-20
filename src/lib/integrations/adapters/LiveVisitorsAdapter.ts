import { BaseAdapter } from '../BaseAdapter';
import { CanonicalEvent, NormalizedField } from '../types';

/**
 * Live Visitors Adapter
 * Native integration for showing real-time visitor counts
 */
export class LiveVisitorsAdapter extends BaseAdapter {
  provider = 'live_visitors';
  displayName = 'Live Visitor Count';
  
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
        description: 'Name of the page being viewed',
        example: 'this page',
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
          'template.page_name': 'this page',
          'template.message': '23 people are viewing this page',
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
          'template.page_name': 'the pricing page',
          'template.message': '12 people are viewing the pricing page',
        },
      },
    ];
  }
}
