import { BaseAdapter } from '../BaseAdapter';
import { CanonicalEvent, NormalizedField } from '../types';

/**
 * Instant Capture Adapter
 * Native integration for capturing real-time user actions
 */
export class InstantCaptureAdapter extends BaseAdapter {
  provider = 'instant_capture';
  displayName = 'Instant Capture';
  
  /**
   * Available fields this adapter can provide
   */
  availableFields(): NormalizedField[] {
    return [
      {
        key: 'template.message',
        label: 'Action Message',
        type: 'string',
        description: 'The captured action message',
        example: 'Someone just signed up!',
        required: true,
      },
      {
        key: 'template.user_name',
        label: 'User Name',
        type: 'string',
        description: 'Name of the user who took action',
        example: 'Emily',
      },
      {
        key: 'template.location',
        label: 'Location',
        type: 'string',
        description: 'User location',
        example: 'Toronto, Canada',
      },
      {
        key: 'template.action_text',
        label: 'Action Text',
        type: 'string',
        description: 'Description of the action',
        example: 'signed up for the newsletter',
      },
      {
        key: 'template.time_ago',
        label: 'Time Ago',
        type: 'string',
        description: 'Relative time of the action',
        example: 'Just now',
      },
    ];
  }
  
  /**
   * Normalize raw event to canonical shape
   */
  normalize(rawEvent: any): CanonicalEvent {
    const action = rawEvent.native_config?.action_text || 'took an action';
    const userName = rawEvent.native_config?.user_name || 'Someone';
    const location = rawEvent.native_config?.location;
    
    const message = location 
      ? `${userName} from ${location} ${action}`
      : `${userName} ${action}`;
    
    return {
      event_id: rawEvent.id || this.generateEventId('ic'),
      provider: this.provider,
      provider_event_type: 'capture',
      timestamp: rawEvent.created_at || new Date().toISOString(),
      payload: rawEvent,
      normalized: {
        'template.message': message,
        'template.user_name': userName,
        'template.location': location,
        'template.action_text': action,
        'template.time_ago': 'Just now',
      },
    };
  }
  
  /**
   * Get sample events for testing and preview
   */
  getSampleEvents(): CanonicalEvent[] {
    return [
      {
        event_id: 'sample-ic-1',
        provider: this.provider,
        provider_event_type: 'capture',
        timestamp: new Date().toISOString(),
        payload: {},
        normalized: {
          'template.message': 'Emily from Toronto just signed up for the newsletter',
          'template.user_name': 'Emily',
          'template.location': 'Toronto, Canada',
          'template.action_text': 'signed up for the newsletter',
          'template.time_ago': 'Just now',
        },
      },
      {
        event_id: 'sample-ic-2',
        provider: this.provider,
        provider_event_type: 'capture',
        timestamp: new Date().toISOString(),
        payload: {},
        normalized: {
          'template.message': 'Someone just downloaded the whitepaper',
          'template.user_name': 'Someone',
          'template.location': undefined,
          'template.action_text': 'downloaded the whitepaper',
          'template.time_ago': 'Just now',
        },
      },
    ];
  }
}
