/**
 * Testimonial Handler for Widget API
 * Fetches testimonials and converts them to widget-compatible events
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

interface TestimonialConfig {
  formId?: string;
  minRating?: number;
  limit?: number;
  onlyApproved?: boolean;
}

interface CanonicalEvent {
  event_id: string;
  provider: string;
  provider_event_type: string;
  timestamp: string;
  payload: any;
  normalized: Record<string, any>;
}

/**
 * Get relative time string from timestamp
 */
function getRelativeTime(timestamp: string): string {
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

/**
 * Normalize testimonial to canonical event format
 */
function normalizeTestimonial(testimonial: any): CanonicalEvent {
  const createdAt = testimonial.created_at || new Date().toISOString();
  const timeAgo = getRelativeTime(createdAt);
  
  const rating = testimonial.rating || 5;
  const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
  
  return {
    event_id: `testimonial_${testimonial.id}`,
    provider: 'testimonials',
    provider_event_type: 'testimonial_submitted',
    timestamp: createdAt,
    payload: testimonial,
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
 * Render Mustache template with event data
 */
function renderTemplate(template: string, data: Record<string, any>): string {
  let rendered = template;
  
  // Simple Mustache-like rendering
  // Replace {{key}} with data[key]
  rendered = rendered.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    const value = data[trimmedKey];
    return value !== undefined && value !== null ? String(value) : '';
  });
  
  return rendered;
}

/**
 * Fetch testimonials and convert to widget events
 */
export async function fetchTestimonialEvents(
  supabase: SupabaseClient,
  websiteId: string,
  config: TestimonialConfig,
  template?: any
): Promise<any[]> {
  try {
    console.log('[Testimonial Handler] Fetching testimonials with config:', config);
    
    const { formId, minRating = 3, limit = 50, onlyApproved = true } = config;
    
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

    const { data: testimonials, error } = await query;

    if (error) {
      console.error('[Testimonial Handler] Fetch error:', error);
      return [];
    }

    if (!testimonials || testimonials.length === 0) {
      console.log('[Testimonial Handler] No testimonials found');
      return [];
    }

    console.log(`[Testimonial Handler] Found ${testimonials.length} testimonials`);

    // Normalize testimonials to canonical events
    const canonicalEvents = testimonials.map(normalizeTestimonial);

    // Convert to widget event format
    const widgetEvents = canonicalEvents.map(event => {
      let messageTemplate = '';
      
      // Apply template if provided
      if (template?.html_template) {
        messageTemplate = renderTemplate(template.html_template, event.normalized);
      } else {
        // Default template
        const name = event.normalized['template.author_name'] || 'Someone';
        const stars = event.normalized['template.rating_stars'] || '★★★★★';
        const message = event.normalized['template.message'] || 'Left a testimonial';
        const timeAgo = event.normalized['template.time_ago'] || 'recently';
        
        messageTemplate = `<div class="testimonial-event">
          <strong>${name}</strong> ${stars}<br>
          "${message}"<br>
          <small>${timeAgo}</small>
        </div>`;
      }

      return {
        id: event.event_id,
        event_type: 'testimonial',
        message_template: messageTemplate,
        user_name: event.normalized['template.author_name'],
        user_location: null,
        created_at: event.timestamp,
        event_data: event.normalized,
        widget_id: null, // Will be set by caller if needed
        source: 'native',
      };
    });

    console.log(`[Testimonial Handler] Converted ${widgetEvents.length} testimonials to widget events`);
    
    return widgetEvents;
  } catch (error) {
    console.error('[Testimonial Handler] Error:', error);
    return [];
  }
}
