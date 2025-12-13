import { BaseAdapter } from '../BaseAdapter';
import { CanonicalEvent, NormalizedField } from '../types';

/**
 * Form Hook Adapter
 * Native integration for capturing form submissions
 */
export class FormHookAdapter extends BaseAdapter {
  provider = 'form_hook';
  displayName = 'Form Capture';
  
  /**
   * Available fields this adapter can provide
   */
  availableFields(): NormalizedField[] {
    return [
      {
        key: 'template.message',
        label: 'Notification Message',
        type: 'string',
        description: 'The form submission notification message',
        example: 'Sarah just subscribed to our newsletter!',
        required: true,
      },
      {
        key: 'template.user_name',
        label: 'User Name',
        type: 'string',
        description: 'Name of the user who submitted the form',
        example: 'Sarah',
      },
      {
        key: 'template.email',
        label: 'Email',
        type: 'string',
        description: 'Email of the user',
        example: 'sarah@example.com',
      },
      {
        key: 'template.location',
        label: 'Location',
        type: 'string',
        description: 'User location (if available)',
        example: 'New York, USA',
      },
      {
        key: 'template.company',
        label: 'Company',
        type: 'string',
        description: 'Company name (if provided)',
        example: 'Acme Inc',
      },
      {
        key: 'template.form_type',
        label: 'Form Type',
        type: 'string',
        description: 'Type of form submitted',
        example: 'newsletter',
      },
      {
        key: 'template.time_ago',
        label: 'Time Ago',
        type: 'string',
        description: 'Relative time of the submission',
        example: 'Just now',
      },
    ];
  }
  
  /**
   * Normalize raw event to canonical shape
   */
  normalize(rawEvent: any): CanonicalEvent {
    const formData = rawEvent.event_data || rawEvent.native_config || {};
    const userName = formData.name || formData.user_name || 'Someone';
    const email = formData.email;
    const location = formData.location;
    const company = formData.company;
    const formType = formData.form_type || 'form';
    
    // Build message based on form type
    let message = rawEvent.message_template || `${userName} just submitted a form`;
    
    // Replace placeholders if message template exists
    if (rawEvent.message_template) {
      message = message
        .replace(/\{\{name\}\}/g, userName)
        .replace(/\{\{email\}\}/g, email || '')
        .replace(/\{\{location\}\}/g, location || '')
        .replace(/\{\{company\}\}/g, company || '');
    }
    
    return {
      event_id: rawEvent.id || this.generateEventId('fh'),
      provider: this.provider,
      provider_event_type: formType,
      timestamp: rawEvent.created_at || new Date().toISOString(),
      payload: rawEvent,
      normalized: {
        'template.message': message,
        'template.user_name': userName,
        'template.email': email,
        'template.location': location,
        'template.company': company,
        'template.form_type': formType,
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
        event_id: 'sample-fh-1',
        provider: this.provider,
        provider_event_type: 'newsletter',
        timestamp: new Date().toISOString(),
        payload: {},
        normalized: {
          'template.message': 'Sarah just subscribed to our newsletter! 📧',
          'template.user_name': 'Sarah',
          'template.email': 'sarah@example.com',
          'template.location': 'New York, USA',
          'template.form_type': 'newsletter',
          'template.time_ago': 'Just now',
        },
      },
      {
        event_id: 'sample-fh-2',
        provider: this.provider,
        provider_event_type: 'demo',
        timestamp: new Date().toISOString(),
        payload: {},
        normalized: {
          'template.message': 'John from Acme Inc just booked a demo! 📅',
          'template.user_name': 'John',
          'template.email': 'john@acme.com',
          'template.company': 'Acme Inc',
          'template.form_type': 'demo',
          'template.time_ago': 'Just now',
        },
      },
      {
        event_id: 'sample-fh-3',
        provider: this.provider,
        provider_event_type: 'signup',
        timestamp: new Date().toISOString(),
        payload: {},
        normalized: {
          'template.message': 'Emily from Toronto just signed up! 🎉',
          'template.user_name': 'Emily',
          'template.email': 'emily@example.com',
          'template.location': 'Toronto, Canada',
          'template.form_type': 'signup',
          'template.time_ago': 'Just now',
        },
      },
    ];
  }
}
