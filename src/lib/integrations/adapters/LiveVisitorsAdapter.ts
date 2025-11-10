import { BaseIntegrationAdapter } from '../BaseAdapter';
import { NormalizedEvent, FetchOptions } from '../IntegrationAdapter';

export class LiveVisitorsAdapter extends BaseIntegrationAdapter {
  id = 'live_visitors';
  displayName = 'Live Visitor Count';
  type = 'native' as const;
  
  async fetchEvents(connectorId: string, options?: FetchOptions): Promise<NormalizedEvent[]> {
    // Native integrations generate events on-the-fly, no fetching needed
    return [];
  }
  
  normalizeEvent(rawEvent: any): NormalizedEvent {
    const count = rawEvent.native_config?.visitor_count || 0;
    const page = rawEvent.native_config?.page_name || 'this page';
    
    return {
      id: rawEvent.id,
      source: 'live_visitors',
      event_type: 'visitor',
      timestamp: new Date(),
      message: `${count} ${count === 1 ? 'person is' : 'people are'} viewing ${page}`,
      metadata: {
        visitor_count: count,
        page_name: page,
        page_url: rawEvent.native_config?.page_url,
      },
      raw_data: rawEvent,
    };
  }
  
  getTemplateFields(): string[] {
    return ['visitor_count', 'page_name'];
  }
  
  getSampleEvent(): NormalizedEvent {
    return {
      id: 'sample-live-visitors',
      source: 'live_visitors',
      event_type: 'visitor',
      timestamp: new Date(),
      message: '🔥 23 people are viewing this page right now',
      metadata: {
        visitor_count: 23,
        page_name: 'this page',
        page_url: '/products',
      },
      raw_data: {},
    };
  }
  
  getSyncConfig() {
    return {
      supportsWebhook: false,
      supportsPolling: false,
      defaultInterval: 0,
      maxEventsPerSync: 0,
    };
  }
}
