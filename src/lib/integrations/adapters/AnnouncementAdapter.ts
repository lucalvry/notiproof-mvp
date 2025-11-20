import { BaseAdapter } from '../BaseAdapter';
import { CanonicalEvent, NormalizedField } from '../types';

export class AnnouncementAdapter extends BaseAdapter {
  provider = 'announcements';
  displayName = 'Announcements';
  
  availableFields(): NormalizedField[] {
    return [
      {
        key: 'template.title',
        label: 'Title',
        type: 'string',
        description: 'Announcement title',
        example: 'New Feature Launch',
        required: true,
      },
      {
        key: 'template.message',
        label: 'Message',
        type: 'string',
        description: 'Announcement message',
        example: 'Check out our new features!',
        required: true,
      },
      {
        key: 'template.cta_text',
        label: 'CTA Text',
        type: 'string',
        description: 'Call-to-action button text',
        example: 'Learn More',
      },
      {
        key: 'template.cta_url',
        label: 'CTA URL',
        type: 'url',
        description: 'Call-to-action link',
        example: 'https://example.com/features',
      },
      {
        key: 'template.icon',
        label: 'Icon',
        type: 'string',
        description: 'Icon identifier',
        example: '🎉',
      },
      {
        key: 'template.image_url',
        label: 'Image',
        type: 'image',
        description: 'Announcement image',
        example: 'https://...',
      },
      {
        key: 'template.priority',
        label: 'Priority',
        type: 'string',
        description: 'Priority level',
        example: 'high',
      },
    ];
  }
  
  normalize(rawEvent: any): CanonicalEvent {
    const announcement = rawEvent.announcement || rawEvent;
    const config = announcement.config || {};
    
    return {
      event_id: this.generateEventId('announcement'),
      provider: 'announcements',
      provider_event_type: 'announcement_scheduled',
      timestamp: announcement.scheduled_at || new Date().toISOString(),
      payload: rawEvent,
      normalized: {
        'template.title': config.title || announcement.title || 'Announcement',
        'template.message': config.message || announcement.message,
        'template.cta_text': config.cta_text || 'Learn More',
        'template.cta_url': config.cta_url || '#',
        'template.icon': config.icon || '📢',
        'template.image_url': config.image_url,
        'template.priority': config.priority || 'normal',
        'meta.display_duration': config.display_duration || 5000,
        'meta.repeat_interval': config.repeat_interval || 0,
      },
    };
  }
  
  getSampleEvents(): CanonicalEvent[] {
    return [
      {
        event_id: 'announcement_sample_1',
        provider: 'announcements',
        provider_event_type: 'announcement_scheduled',
        timestamp: new Date().toISOString(),
        payload: {},
        normalized: {
          'template.title': '🎉 New Feature Released',
          'template.message': 'Check out our brand new dashboard with advanced analytics!',
          'template.cta_text': 'Explore Now',
          'template.cta_url': '/dashboard',
          'template.icon': '🎉',
          'template.priority': 'high',
        },
      },
      {
        event_id: 'announcement_sample_2',
        provider: 'announcements',
        provider_event_type: 'announcement_scheduled',
        timestamp: new Date().toISOString(),
        payload: {},
        normalized: {
          'template.title': '⚡ Limited Time Offer',
          'template.message': 'Get 30% off on all premium plans. Offer ends soon!',
          'template.cta_text': 'Upgrade Now',
          'template.cta_url': '/pricing',
          'template.icon': '⚡',
          'template.priority': 'urgent',
        },
      },
    ];
  }
}
