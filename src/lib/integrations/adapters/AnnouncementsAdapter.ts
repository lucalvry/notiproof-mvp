import { BaseIntegrationAdapter } from '../BaseAdapter';
import { NormalizedEvent, FetchOptions } from '../IntegrationAdapter';

export class AnnouncementsAdapter extends BaseIntegrationAdapter {
  id = 'announcements';
  displayName = 'Smart Announcements';
  type = 'native' as const;
  
  async fetchEvents(connectorId: string, options?: FetchOptions): Promise<NormalizedEvent[]> {
    // Native integrations generate events on-the-fly, no fetching needed
    return [];
  }
  
  normalizeEvent(rawEvent: any): NormalizedEvent {
    return {
      id: rawEvent.id,
      source: 'announcements',
      event_type: 'announcement',
      timestamp: new Date(),
      message: rawEvent.native_config?.title || '',
      metadata: {
        message: rawEvent.native_config?.message,
        cta_text: rawEvent.native_config?.cta_text,
        cta_url: rawEvent.native_config?.cta_url,
      },
      raw_data: rawEvent,
    };
  }
  
  getTemplateFields(): string[] {
    return ['title', 'message', 'cta_text'];
  }
  
  getSampleEvent(): NormalizedEvent {
    return {
      id: 'sample-announcement',
      source: 'announcements',
      event_type: 'announcement',
      timestamp: new Date(),
      message: '🎉 50% OFF Flash Sale - Today Only!',
      metadata: {
        message: 'Use code FLASH50 at checkout',
        cta_text: 'Shop Now',
        cta_url: '/products',
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
