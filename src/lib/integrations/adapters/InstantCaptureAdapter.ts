import { BaseIntegrationAdapter } from '../BaseAdapter';
import { NormalizedEvent, FetchOptions } from '../IntegrationAdapter';

export class InstantCaptureAdapter extends BaseIntegrationAdapter {
  id = 'instant_capture';
  displayName = 'Instant Capture';
  type = 'native' as const;
  
  async fetchEvents(connectorId: string, options?: FetchOptions): Promise<NormalizedEvent[]> {
    // Native integrations generate events on-the-fly, no fetching needed
    return [];
  }
  
  normalizeEvent(rawEvent: any): NormalizedEvent {
    const action = rawEvent.native_config?.action_text || 'took an action';
    const userName = rawEvent.native_config?.user_name || 'Someone';
    const location = rawEvent.native_config?.location;
    
    return {
      id: rawEvent.id,
      source: 'instant_capture',
      event_type: 'capture',
      timestamp: new Date(),
      message: location 
        ? `${userName} from ${location} ${action}`
        : `${userName} ${action}`,
      user_name: userName,
      user_location: location,
      metadata: {
        action_text: action,
        page_url: rawEvent.native_config?.page_url,
      },
      raw_data: rawEvent,
    };
  }
  
  getTemplateFields(): string[] {
    return ['user_name', 'user_location', 'action_text'];
  }
  
  getSampleEvent(): NormalizedEvent {
    return {
      id: 'sample-instant-capture',
      source: 'instant_capture',
      event_type: 'capture',
      timestamp: new Date(),
      message: 'Emily from Toronto just signed up for the newsletter',
      user_name: 'Emily',
      user_location: 'Toronto, Canada',
      metadata: {
        action_text: 'signed up for the newsletter',
        page_url: '/newsletter',
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
