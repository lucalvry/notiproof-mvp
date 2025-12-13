/**
 * Build Notification Queue - Phase 2: Queue Orchestration
 * 
 * Fetches events with per-type limits, applies weighted interleaving,
 * and returns an optimized queue of max 15 events.
 * 
 * IMPORTANT: For testimonials, this function creates/updates event records
 * in the events table so that views/clicks tracking works correctly.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationWeight {
  event_type: string;
  weight: number;
  max_per_queue: number;
  ttl_days: number;
}

interface QueueConfig {
  websiteId: string;
  widgetIds: string[];
  targetQueueSize?: number;
}

const DEFAULT_WEIGHTS: Record<string, NotificationWeight> = {
  'purchase': { event_type: 'purchase', weight: 10, max_per_queue: 20, ttl_days: 7 },
  'testimonial': { event_type: 'testimonial', weight: 8, max_per_queue: 15, ttl_days: 180 },
  'form_capture': { event_type: 'form_capture', weight: 7, max_per_queue: 20, ttl_days: 14 },
  'signup': { event_type: 'signup', weight: 6, max_per_queue: 20, ttl_days: 14 },
  'announcement': { event_type: 'announcement', weight: 4, max_per_queue: 5, ttl_days: 30 },
  'live_visitors': { event_type: 'live_visitors', weight: 2, max_per_queue: 3, ttl_days: 1 },
};

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
 * Render Mustache template with event data (supports conditionals)
 */
function renderTemplate(template: string, data: Record<string, any>): string {
  let rendered = template;
  
  // Step 1: Handle section blocks {{#key}}...{{/key}} (show if truthy)
  rendered = rendered.replace(/\{\{#([^}]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, content) => {
    const trimmedKey = key.trim();
    const value = data[trimmedKey];
    // Show content if value is truthy (not null, undefined, false, empty string, or 0)
    if (value !== undefined && value !== null && value !== '' && value !== false) {
      return content;
    }
    return '';
  });
  
  // Step 2: Handle inverted blocks {{^key}}...{{/key}} (show if falsy)
  rendered = rendered.replace(/\{\{\^([^}]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, content) => {
    const trimmedKey = key.trim();
    const value = data[trimmedKey];
    // Show content if value is falsy
    if (value === undefined || value === null || value === '' || value === false) {
      return content;
    }
    return '';
  });
  
  // Step 3: Handle simple substitutions {{key}}
  rendered = rendered.replace(/\{\{([^#^/][^}]*)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    const value = data[trimmedKey];
    return value !== undefined && value !== null ? String(value) : '';
  });
  
  return rendered;
}

/**
 * Get or create an event record for a testimonial
 * This ensures views/clicks tracking works
 */
async function getOrCreateTestimonialEvent(
  supabase: any,
  testimonial: any,
  widgetId: string,
  websiteId: string,
  messageTemplate: string,
  normalizedData: Record<string, any>,
  authorName: string
): Promise<string> {
  const externalId = `testimonial_${testimonial.id}`;
  
  // Check if event already exists
  const { data: existingEvent, error: fetchError } = await supabase
    .from('events')
    .select('id')
    .eq('external_id', externalId)
    .maybeSingle();
  
  if (fetchError) {
    console.error(`[Queue Builder] Error checking existing event for ${externalId}:`, fetchError);
  }
  
  if (existingEvent?.id) {
    // Update the event with latest template/data (but preserve views/clicks)
    const { error: updateError } = await supabase
      .from('events')
      .update({
        message_template: messageTemplate,
        event_data: normalizedData,
        user_name: authorName,
      })
      .eq('id', existingEvent.id);
    
    if (updateError) {
      console.error(`[Queue Builder] Error updating event ${existingEvent.id}:`, updateError);
    }
    
    return existingEvent.id;
  }
  
  // Create new event record
  const { data: newEvent, error: insertError } = await supabase
    .from('events')
    .insert({
      external_id: externalId,
      event_type: 'testimonial',
      widget_id: widgetId,
      website_id: websiteId,
      event_data: normalizedData,
      message_template: messageTemplate,
      user_name: authorName,
      moderation_status: 'approved',
      status: 'approved',
      source: 'manual',
      views: 0,
      clicks: 0,
      created_at: testimonial.created_at || new Date().toISOString(),
    })
    .select('id')
    .single();
  
  if (insertError) {
    console.error(`[Queue Builder] Error creating event for testimonial ${testimonial.id}:`, insertError);
    // Return a fallback synthetic ID if insert fails
    return externalId;
  }
  
  console.log(`[Queue Builder] Created event ${newEvent.id} for testimonial ${testimonial.id}`);
  return newEvent.id;
}

/**
 * Fetch events grouped by type with per-type limits and TTL
 */
async function fetchGroupedEvents(
  supabase: any,
  config: QueueConfig,
  weights: Record<string, NotificationWeight>
): Promise<Record<string, any[]>> {
  const grouped: Record<string, any[]> = {};
  
  console.log('[Queue Builder] Fetching events for', config.widgetIds.length, 'widgets');
  
  // Fetch testimonial template for rendering
  const { data: testimonialTemplate } = await supabase
    .from('templates')
    .select('*')
    .eq('provider', 'testimonials')
    .eq('template_key', 'testimonial_split_view')
    .single();
  
  for (const [eventType, weightConfig] of Object.entries(weights)) {
    const ttlDate = new Date(Date.now() - weightConfig.ttl_days * 86400000).toISOString();
    
    // Special handling for testimonials - fetch from testimonials table
    if (eventType === 'testimonial') {
      // First, find the testimonial campaign to get the correct widget
      const { data: allCampaigns } = await supabase
        .from('campaigns')
        .select('id, data_sources')
        .eq('website_id', config.websiteId)
        .eq('status', 'active');
      
      // Find the campaign with testimonials provider in data_sources
      let testimonialCampaignId: string | null = null;
      for (const camp of (allCampaigns || [])) {
        const sources = Array.isArray(camp.data_sources) ? camp.data_sources : [];
        if (sources.some((ds: any) => ds.provider === 'testimonials')) {
          testimonialCampaignId = camp.id;
          break;
        }
      }
      
      // Get the widget for the testimonial campaign
      let testimonialWidgetId = config.widgetIds[0]; // fallback
      if (testimonialCampaignId) {
        const { data: testimonialWidget } = await supabase
          .from('widgets')
          .select('id')
          .eq('campaign_id', testimonialCampaignId)
          .single();
        
        if (testimonialWidget?.id) {
          testimonialWidgetId = testimonialWidget.id;
          console.log('[Queue Builder] Found testimonial campaign widget:', { testimonialCampaignId, testimonialWidgetId });
        }
      }
      
      const { data: testimonials, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('website_id', config.websiteId)
        .eq('status', 'approved')
        .gte('created_at', ttlDate)
        .order('created_at', { ascending: false })
        .limit(weightConfig.max_per_queue);
      
      if (error) {
        console.error(`[Queue Builder] Error fetching testimonials:`, error);
        grouped[eventType] = [];
      } else {
        // Transform testimonials to event format
        const transformedEvents = [];
        
        for (const t of (testimonials || [])) {
          const createdAt = t.created_at || new Date().toISOString();
          const timeAgo = getRelativeTime(createdAt);
          const rating = t.rating || 5;
          const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
          const authorName = t.author_name || 'Anonymous Customer';
          const authorPosition = t.author_position || t.metadata?.position || 'Customer';
          const authorCompany = t.author_company || t.metadata?.company || 'Happy Customer';
          // Prioritize author_avatar_url (where form submissions store avatars)
          const authorAvatar = t.author_avatar_url || 
            t.avatar_url ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=2563EB&color=fff`;
          
          // Generate initials for fallback
          const authorInitials = authorName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
          
          // Prepare normalized data with correct field mappings
          const normalized = {
            'template.author_name': authorName,
            'template.author_email': t.author_email || '',
            'template.author_avatar': authorAvatar,
            'template.author_initials': authorInitials,
            'template.author_position': authorPosition,
            'template.author_company': authorCompany,
            'template.rating': rating,
            'template.rating_stars': stars,
            'template.message': t.message || 'Great experience!',
            // image_url: check direct field first, then metadata
            'template.image_url': t.image_url || t.metadata?.product_image_url || null,
            'template.video_url': t.video_url || null,
            // video_thumbnail: for video testimonials, use avatar as thumbnail
            'template.video_thumbnail': t.video_url ? (t.author_avatar_url || t.avatar_url || authorAvatar) : null,
            'template.time_ago': timeAgo,
            'template.verified': !!t.metadata?.verified_purchase,
            // Also include flat keys for compatibility
            author_name: authorName,
            author_avatar: authorAvatar,
            message: t.message || 'Great experience!',
            rating: rating,
            time_ago: timeAgo,
          };
          
          // Render template
          let messageTemplate = '';
          if (testimonialTemplate?.html_template) {
            messageTemplate = renderTemplate(testimonialTemplate.html_template, normalized);
          } else {
            // Fallback template
            messageTemplate = `<div class="testimonial-event">
              <strong>${authorName}</strong> ${stars}<br>
              "${normalized['template.message']}"<br>
              <small>${timeAgo}</small>
            </div>`;
          }
          
          // Get or create the actual event record using the CORRECT testimonial widget
          let eventId: string;
          
          if (testimonialWidgetId) {
            eventId = await getOrCreateTestimonialEvent(
              supabase,
              t,
              testimonialWidgetId,
              config.websiteId,
              messageTemplate,
              normalized,
              authorName
            );
          } else {
            // Fallback to synthetic ID if no widget
            eventId = `testimonial_${t.id}`;
          }
          
          transformedEvents.push({
            id: eventId, // Use real event ID for tracking
            event_type: 'testimonial',
            message_template: messageTemplate,
            user_name: authorName,
            user_location: null,
            created_at: createdAt,
            event_data: normalized,
            widget_id: testimonialWidgetId,
            moderation_status: 'approved',
            status: 'approved',
            // Include original testimonial ID for reference
            testimonial_id: t.id,
          });
        }
        
        grouped[eventType] = transformedEvents;
        console.log(`[Queue Builder] Fetched and processed ${testimonials?.length || 0} testimonial events`);
      }
    } else if (eventType === 'form_capture') {
      // Step 1: Fetch form_capture events without the problematic join
      const { data: formEvents, error } = await supabase
        .from('events')
        .select('*')
        .eq('website_id', config.websiteId)
        .eq('event_type', 'form_capture')
        .eq('moderation_status', 'approved')
        .eq('status', 'approved')
        .gte('created_at', ttlDate)
        .order('created_at', { ascending: false })
        .limit(weightConfig.max_per_queue);
      
      if (error) {
        console.error(`[Queue Builder] Error fetching form_capture events:`, error);
        grouped[eventType] = [];
      } else {
        // Step 2: Fetch form capture campaign settings for this website
        const { data: formCaptureCampaign } = await supabase
          .from('campaigns')
          .select('integration_settings')
          .eq('website_id', config.websiteId)
          .not('integration_settings->form_type', 'is', null)
          .limit(1)
          .maybeSingle();
        
        const campaignSettings = formCaptureCampaign?.integration_settings || {};
        const defaultAvatar = campaignSettings.avatar || '📧';
        const defaultMessageTemplate = campaignSettings.message_template || '{{name}} just signed up';
        
        console.log(`[Queue Builder] Form capture campaign settings:`, { 
          avatar: defaultAvatar, 
          template: defaultMessageTemplate,
          found: !!formCaptureCampaign 
        });
        
        // Step 3: Transform events with campaign settings
        const transformedEvents = (formEvents || []).map((e: any) => {
          const messageTemplate = e.message_template || defaultMessageTemplate;
          const eventData = e.event_data || {};
          const flatData = eventData.flattened_fields || eventData;
          const renderedMessage = renderTemplate(messageTemplate, flatData);
          
          return {
            ...e,
            message_template: renderedMessage,
            event_data: {
              ...e.event_data,
              avatar: defaultAvatar,
              rendered_message: renderedMessage
            }
          };
        });
        
        grouped[eventType] = transformedEvents;
        console.log(`[Queue Builder] Fetched and processed ${formEvents?.length || 0} form_capture events`);
      }
    } else {
      // Fetch from events table for other event types
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .in('widget_id', config.widgetIds)
        .eq('event_type', eventType)
        .eq('moderation_status', 'approved')
        .eq('status', 'approved')
        .gte('created_at', ttlDate)
        .order('created_at', { ascending: false })
        .limit(weightConfig.max_per_queue);
      
      if (error) {
        console.error(`[Queue Builder] Error fetching ${eventType}:`, error);
        grouped[eventType] = [];
      } else {
        grouped[eventType] = data || [];
        console.log(`[Queue Builder] Fetched ${data?.length || 0} ${eventType} events`);
      }
    }
  }
  
  return grouped;
}

/**
 * Build weighted queue using round-robin selection based on weights
 */
function buildWeightedQueue(
  groupedEvents: Record<string, any[]>,
  weights: Record<string, NotificationWeight>,
  targetQueueSize: number = 15
): any[] {
  const queue: any[] = [];
  const cursors: Record<string, number> = {};
  
  // Initialize cursors
  Object.keys(groupedEvents).forEach(type => cursors[type] = 0);
  
  console.log('[Queue Builder] Building weighted queue, target size:', targetQueueSize);
  
  // Build weighted selection pool
  while (queue.length < targetQueueSize) {
    // Calculate total remaining weight
    let totalWeight = 0;
    const available: string[] = [];
    
    for (const type of Object.keys(groupedEvents)) {
      if (cursors[type] < groupedEvents[type].length) {
        totalWeight += weights[type]?.weight || 5;
        available.push(type);
      }
    }
    
    if (available.length === 0) {
      console.log('[Queue Builder] No more events available, queue size:', queue.length);
      break; // No more events
    }
    
    // Weighted random selection
    let random = Math.random() * totalWeight;
    let selectedType = available[0];
    
    for (const type of available) {
      random -= weights[type]?.weight || 5;
      if (random <= 0) {
        selectedType = type;
        break;
      }
    }
    
    // Add event from selected type
    const event = groupedEvents[selectedType][cursors[selectedType]];
    if (event) {
      queue.push(event);
      cursors[selectedType]++;
    }
  }
  
  console.log('[Queue Builder] Final queue distribution:', 
    Object.fromEntries(
      Object.entries(groupedEvents).map(([k, v]) => [
        k, 
        queue.filter(e => e.event_type === k).length
      ])
    )
  );
  
  return queue;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { websiteId, widgetIds, targetQueueSize = 15 } = await req.json();

    if (!websiteId || !widgetIds || widgetIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing websiteId or widgetIds' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Queue Builder] Building queue for website:', websiteId);

    // Fetch notification weights for this website
    const { data: customWeights } = await supabase
      .from('notification_weights')
      .select('*')
      .eq('website_id', websiteId);

    // Merge custom weights with defaults
    const weights: Record<string, NotificationWeight> = { ...DEFAULT_WEIGHTS };
    if (customWeights) {
      for (const weight of customWeights) {
        weights[weight.event_type] = weight;
      }
    }

    // Fetch grouped events
    const groupedEvents = await fetchGroupedEvents(supabase, { websiteId, widgetIds, targetQueueSize }, weights);

    // Build weighted queue
    const queue = buildWeightedQueue(groupedEvents, weights, targetQueueSize);

    // Calculate distribution
    const distribution: Record<string, number> = {};
    for (const event of queue) {
      distribution[event.event_type] = (distribution[event.event_type] || 0) + 1;
    }

    const totalAvailable = Object.values(groupedEvents).reduce((sum, arr) => sum + arr.length, 0);

    return new Response(
      JSON.stringify({
        events: queue,
        queue_metadata: {
          total_available: totalAvailable,
          distribution,
          weights_applied: Object.fromEntries(
            Object.entries(weights).map(([k, v]) => [k, v.weight])
          ),
          ttl_applied: true,
          queue_size: queue.length,
          generated_at: new Date().toISOString()
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Queue Builder] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
