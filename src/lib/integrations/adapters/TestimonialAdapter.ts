import { BaseAdapter } from '../BaseAdapter';
import { CanonicalEvent, NormalizedField } from '../types';
import { supabase } from '@/integrations/supabase/client';

export class TestimonialAdapter extends BaseAdapter {
  provider = 'testimonials';
  displayName = 'Testimonials';
  
  availableFields(): NormalizedField[] {
    return [
      {
        key: 'template.author_name',
        label: 'Author Name',
        type: 'string',
        description: 'Testimonial author name',
        example: 'Jane Smith',
        required: true,
      },
      {
        key: 'template.author_email',
        label: 'Author Email',
        type: 'string',
        description: 'Author email address',
        example: 'jane@example.com',
      },
      {
        key: 'template.author_avatar',
        label: 'Author Avatar',
        type: 'image',
        description: 'Author profile picture',
        example: 'https://...',
      },
      {
        key: 'template.rating',
        label: 'Rating',
        type: 'number',
        description: 'Star rating (1-5)',
        example: 5,
        required: true,
      },
      {
        key: 'template.message',
        label: 'Testimonial Message',
        type: 'string',
        description: 'Testimonial text content',
        example: 'This product changed my life!',
        required: true,
      },
      {
        key: 'template.image_url',
        label: 'Testimonial Image',
        type: 'image',
        description: 'Optional testimonial image',
        example: 'https://...',
      },
      {
        key: 'template.video_url',
        label: 'Testimonial Video',
        type: 'url',
        description: 'Optional testimonial video',
        example: 'https://youtube.com/...',
      },
      {
        key: 'template.time_ago',
        label: 'Time Ago',
        type: 'string',
        description: 'Relative time',
        example: '2 days ago',
      },
      {
        key: 'template.verified',
        label: 'Verified Purchase',
        type: 'boolean',
        description: 'Whether purchase is verified',
        example: true,
      },
    ];
  }
  
  normalize(rawEvent: any): CanonicalEvent {
    const testimonial = rawEvent.testimonial || rawEvent;
    
    // Calculate relative time
    const createdAt = testimonial.created_at || new Date().toISOString();
    const timeAgo = this.getRelativeTime(createdAt);
    
    // Generate star display
    const rating = testimonial.rating || 5;
    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
    
    return {
      event_id: this.generateEventId('testimonial'),
      provider: 'testimonials',
      provider_event_type: 'testimonial_submitted',
      timestamp: createdAt,
      payload: rawEvent,
      normalized: {
        'template.author_name': testimonial.author_name,
        'template.author_email': testimonial.author_email,
        'template.author_avatar': testimonial.author_avatar_url,
        'template.rating': rating,
        'template.rating_stars': stars,
        'template.message': testimonial.message,
        'template.image_url': testimonial.image_url,
        'template.video_url': testimonial.video_url,
        'template.time_ago': timeAgo,
        'template.verified': !!testimonial.metadata?.verified_purchase,
        'meta.source': testimonial.source || 'form',
        'meta.status': testimonial.status || 'pending',
      },
    };
  }
  
  /**
   * Fetch testimonials from database
   */
  async fetchEvents(config: any): Promise<CanonicalEvent[]> {
    try {
      const { websiteId, formId, limit = 50, minRating = 3, onlyApproved = true } = config;
      
      let query = supabase
        .from('testimonials')
        .select('*')
        .eq('website_id', websiteId)
        .order('created_at', { ascending: false })
        .limit(limit);

      // Filter by form if specified
      if (formId) {
        query = query.eq('form_id', formId);
      }

      // Filter by rating if specified
      if (minRating) {
        query = query.gte('rating', minRating);
      }

      // Filter by status if onlyApproved
      if (onlyApproved) {
        query = query.eq('status', 'approved');
      }

      const { data, error } = await query;

      if (error) {
        console.error('[TestimonialAdapter] Fetch error:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Normalize all fetched testimonials
      return data.map(testimonial => this.normalize(testimonial));
    } catch (error) {
      console.error('[TestimonialAdapter] Fetch error:', error);
      return [];
    }
  }

  getSampleEvents(): CanonicalEvent[] {
    return [
      {
        event_id: 'testimonial_sample_1',
        provider: 'testimonials',
        provider_event_type: 'testimonial_submitted',
        timestamp: new Date().toISOString(),
        payload: {},
        normalized: {
          'template.author_name': 'Emma Wilson',
          'template.author_avatar': 'https://i.pravatar.cc/150?img=1',
          'template.rating': 5,
          'template.rating_stars': '★★★★★',
          'template.message': 'This product has transformed our business! The support team is incredible.',
          'template.time_ago': '2 days ago',
          'template.verified': true,
          'meta.source': 'form',
          'meta.status': 'approved',
        },
      },
      {
        event_id: 'testimonial_sample_2',
        provider: 'testimonials',
        provider_event_type: 'testimonial_submitted',
        timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
        payload: {},
        normalized: {
          'template.author_name': 'Michael Chen',
          'template.author_avatar': 'https://i.pravatar.cc/150?img=12',
          'template.rating': 5,
          'template.rating_stars': '★★★★★',
          'template.message': 'Best investment we\'ve made this year. Highly recommended!',
          'template.time_ago': '3 days ago',
          'template.verified': true,
          'meta.source': 'form',
          'meta.status': 'approved',
        },
      },
    ];
  }
  
  private getRelativeTime(timestamp: string): string {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays <= 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks <= 4) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
    
    return then.toLocaleDateString();
  }
}
