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
  'live_visitors': { event_type: 'live_visitors', weight: 2, max_per_queue: 1, ttl_days: 1 },
};

/**
 * Verification Badge Logic - Determines when to show "✓ NotiProof Verified"
 * 
 * Rules:
 * - Shopify, Stripe, WooCommerce, Testimonials, Form Hook: Always show (real customer data)
 * - Live Visitors (Visitors Pulse): Only show when mode === 'real'
 * - Announcements: Never show (business-created content)
 * - Simulated/Demo data: Never show
 */
const VERIFICATION_BADGE_HTML = '<span class="notiproof-verified" style="color: #2563EB; font-size: 11px; font-weight: 500; margin-left: 8px;">✓ NotiProof Verified</span>';

function shouldShowVerificationBadge(eventType: string, eventData: Record<string, any>): boolean {
  // Never show for announcements (business-created content)
  if (eventType === 'announcement') return false;
  
  // Visitors Pulse / Live Visitors: only show for real mode
  if (eventType === 'live_visitors') {
    return eventData?.mode === 'real';
  }
  
  // Never show for explicitly simulated/demo data
  if (eventData?.isSimulated || eventData?.isDemo) return false;
  
  // Show for all real data providers
  const verifiedEventTypes = ['purchase', 'testimonial', 'form_capture', 'signup', 'payment'];
  return verifiedEventTypes.includes(eventType);
}

/**
 * Append verification badge to notification HTML if applicable
 */
function appendVerificationBadge(html: string, eventType: string, eventData: Record<string, any>): string {
  if (!shouldShowVerificationBadge(eventType, eventData)) {
    return html;
  }
  
  // Try to insert badge before the last closing div
  const lastDivIndex = html.lastIndexOf('</div>');
  if (lastDivIndex !== -1) {
    return html.slice(0, lastDivIndex) + VERIFICATION_BADGE_HTML + html.slice(lastDivIndex);
  }
  
  // Fallback: append to end
  return html + VERIFICATION_BADGE_HTML;
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
      // Step 1: Find active campaigns with form_capture settings (they are stored as campaign_type='notification')
      const { data: allActiveCampaigns } = await supabase
        .from('campaigns')
        .select('id, integration_settings, native_config, data_sources')
        .eq('website_id', config.websiteId)
        .eq('status', 'active');
      
      // Filter to find campaigns that have form_capture/form_hook data source or form capture settings
      const formCaptureCampaigns = (allActiveCampaigns || []).filter((c: any) => {
        // Check if it has form_hook in data_sources
        const dataSources = Array.isArray(c.data_sources) ? c.data_sources : [];
        const hasFormHook = dataSources.some((ds: any) => ds.provider === 'form_hook');
        
        // Or check if it has form capture settings in integration_settings/native_config
        const settings = c.integration_settings || c.native_config || {};
        const hasFormSettings = settings.source_mode || settings.form_type;
        
        return hasFormHook || hasFormSettings;
      });
      
      // Get the primary campaign settings (first active form_capture campaign)
      const primaryCampaign = formCaptureCampaigns?.[0];
      const campaignSettings = primaryCampaign?.integration_settings || primaryCampaign?.native_config || {};
      const sourceMode = campaignSettings.source_mode || 'type';
      const preserveOriginalMessage = sourceMode === 'all';
      const filterIntegrationId = sourceMode === 'integration' ? campaignSettings.integration_id : null;
      
      console.log(`[Queue Builder] Form capture source_mode: ${sourceMode}, preserve_original: ${preserveOriginalMessage}, found ${formCaptureCampaigns.length} form capture campaigns`);
      
      // Step 2: Build query - for 'all' mode, fetch all form_capture events for the website
      let query = supabase
        .from('events')
        .select('*')
        .eq('website_id', config.websiteId)
        .eq('event_type', 'form_capture')
        .eq('moderation_status', 'approved')
        .eq('status', 'approved')
        .gte('created_at', ttlDate)
        .order('created_at', { ascending: false })
        .limit(weightConfig.max_per_queue);
      
      // Only filter by widget_ids if NOT in "all" mode
      if (sourceMode !== 'all' && config.widgetIds.length > 0) {
        query = query.in('widget_id', config.widgetIds);
      }
      
      // Filter by specific integration if source_mode = 'integration'
      if (filterIntegrationId) {
        query = query.contains('event_data', { integration_id: filterIntegrationId });
      }
      
      const { data: formEvents, error } = await query;
      
      if (error) {
        console.error(`[Queue Builder] Error fetching form_capture events:`, error);
        grouped[eventType] = [];
      } else {
        // Step 3: Build a map of widget_id -> campaign settings for proper per-event settings
        const widgetIds = [...new Set((formEvents || []).map((e: any) => e.widget_id).filter(Boolean))];
        
        // Fetch widgets with their campaign_ids
        const { data: widgetCampaigns } = await supabase
          .from('widgets')
          .select('id, campaign_id, style_config')
          .in('id', widgetIds.length > 0 ? widgetIds : ['00000000-0000-0000-0000-000000000000']);
        
        // Build lookup: widget_id -> widget data
        const widgetMap = new Map<string, any>();
        (widgetCampaigns || []).forEach((w: any) => widgetMap.set(w.id, w));
        
        // Fetch all relevant campaigns' settings
        const campaignIds = [...new Set((widgetCampaigns || []).map((w: any) => w.campaign_id).filter(Boolean))];
        
        const { data: campaigns } = await supabase
          .from('campaigns')
          .select('id, integration_settings, native_config')
          .in('id', campaignIds.length > 0 ? campaignIds : ['00000000-0000-0000-0000-000000000000']);
        
        // Build lookup: campaign_id -> campaign settings
        const campaignMap = new Map<string, any>();
        (campaigns || []).forEach((c: any) => {
          const settings = c.integration_settings || c.native_config || {};
          campaignMap.set(c.id, settings);
        });
        
        console.log(`[Queue Builder] Form capture: ${widgetIds.length} widgets, ${campaignIds.length} campaigns, sourceMode: ${sourceMode}`);
        
        // Step 4: Transform events - respect source_mode for message handling
        const transformedEvents = (formEvents || []).map((e: any) => {
          const widget = widgetMap.get(e.widget_id);
          const eventCampaignSettings = widget?.campaign_id ? campaignMap.get(widget.campaign_id) : {};
          const widgetStyleConfig = (widget?.style_config || {}) as Record<string, any>;
          
          const avatar = eventCampaignSettings?.avatar || '📧';
          const contentAlignment = eventCampaignSettings?.content_alignment || 'top';
          
          const eventData = e.event_data || {};
          const flatData = eventData.flattened_fields || eventData;
          
          // Normalize field names for template rendering (handle hyphenated field names)
          const normalizedData = {
            ...flatData,
            name: flatData.name || flatData['full-name'] || flatData.full_name || flatData['first-name'] || flatData.first_name || e.user_name || 'Someone',
            company: flatData.company || flatData['company-name'] || flatData.company_name || flatData.organization || '',
            email: flatData.email || flatData['your-email'] || e.user_email || '',
            location: flatData.location || flatData.city || e.user_location || '',
          };
          
          // Determine message template based on source_mode
          let messageTemplate: string;
          if (preserveOriginalMessage && e.message_template) {
            // source_mode = 'all': Use the event's original message_template (from integration rule)
            messageTemplate = e.message_template;
          } else {
            // source_mode = 'type' or 'integration': Use campaign's configured template
            messageTemplate = eventCampaignSettings?.message_template || '{{name}} just signed up';
          }
          
          const renderedMessage = renderTemplate(messageTemplate, normalizedData);
          
          return {
            ...e,
            message_template: renderedMessage,
            // Design settings at top-level for widget.js to read correctly
            design_settings: {
              contentAlignment: widgetStyleConfig.contentAlignment || contentAlignment,
              backgroundColor: widgetStyleConfig.backgroundColor || eventCampaignSettings?.backgroundColor,
              textColor: widgetStyleConfig.textColor || eventCampaignSettings?.textColor,
              primaryColor: widgetStyleConfig.primaryColor || eventCampaignSettings?.primaryColor,
              borderRadius: widgetStyleConfig.borderRadius || eventCampaignSettings?.borderRadius,
              shadow: widgetStyleConfig.shadow || eventCampaignSettings?.shadow,
              fontSize: widgetStyleConfig.fontSize || eventCampaignSettings?.fontSize,
              fontFamily: widgetStyleConfig.fontFamily || eventCampaignSettings?.fontFamily,
            },
            event_data: {
              ...e.event_data,
              avatar: avatar,
              rendered_message: renderedMessage,
              normalized: normalizedData,
              source_mode: sourceMode,
            }
          };
        });
        
        grouped[eventType] = transformedEvents;
        console.log(`[Queue Builder] Fetched and processed ${formEvents?.length || 0} form_capture events (source_mode: ${sourceMode})`);
      }
    } else if (eventType === 'live_visitors') {
      // Generate synthetic live_visitors events from active campaigns
      const { data: visitorCampaigns, error: campError } = await supabase
        .from('campaigns')
        .select(`
          id, name, native_config, data_sources,
          templates:template_id (id, name, template_key, html_template, style_variant)
        `)
        .eq('website_id', config.websiteId)
        .eq('status', 'active');
      
      if (campError) {
        console.error(`[Queue Builder] Error fetching live_visitors campaigns:`, campError);
        grouped[eventType] = [];
      } else {
        // Find campaigns with live_visitors provider
        const liveVisitorCampaigns = (visitorCampaigns || []).filter((c: any) => {
          const sources = Array.isArray(c.data_sources) ? c.data_sources : [];
          return sources.some((s: any) => s.provider === 'live_visitors');
        });
        
        if (liveVisitorCampaigns.length > 0) {
          const campaign = liveVisitorCampaigns[0];
          const nativeConfig = campaign.native_config || {};
          const liveVisitorSource = (campaign.data_sources as any[])?.find((s: any) => s.provider === 'live_visitors');
          
          // Fetch the widget's style_config for this campaign
          const { data: widgetData } = await supabase
            .from('widgets')
            .select('id, style_config')
            .eq('campaign_id', campaign.id)
            .maybeSingle();
          
          const widgetStyleConfig = (widgetData?.style_config as Record<string, any>) || {};
          
          // Generate config from native_config or data_source config
          const minCount = nativeConfig.min_count || liveVisitorSource?.config?.min_count || 5;
          const maxCount = nativeConfig.max_count || liveVisitorSource?.config?.max_count || 25;
          const count = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
          
          // Generate a single live_visitors event per campaign (it's a counter, not multiple notifications)
          const showLocation = nativeConfig.show_location !== false;
          
          // Build design_settings from widget's style_config
          const designSettings = {
            content_alignment: nativeConfig.content_alignment || widgetStyleConfig.contentAlignment || 'top',
            fontSize: widgetStyleConfig.fontSize || nativeConfig.fontSize || 14,
            fontFamily: widgetStyleConfig.fontFamily || nativeConfig.fontFamily || 'system',
            borderRadius: widgetStyleConfig.borderRadius !== undefined ? widgetStyleConfig.borderRadius : (nativeConfig.borderRadius ?? 12),
            borderWidth: widgetStyleConfig.borderWidth ?? nativeConfig.borderWidth ?? 0,
            borderColor: widgetStyleConfig.borderColor || nativeConfig.borderColor || '#e5e7eb',
            shadow: widgetStyleConfig.shadow || nativeConfig.shadow || 'md',
            backgroundColor: widgetStyleConfig.backgroundColor || nativeConfig.backgroundColor || '#ffffff',
            textColor: widgetStyleConfig.textColor || nativeConfig.textColor || '#1a1a1a',
            linkColor: widgetStyleConfig.linkColor || nativeConfig.linkColor || '#667eea',
          };
          
          // Generate a single count for this visitor counter
          const visitorCount = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
          const peopleText = visitorCount === 1 ? 'person is' : 'people are';
          const templateStyle = nativeConfig.template_style || 'social_proof';
          
          // Template variables for all template types
          const templateData: Record<string, any> = {
            // Standard count variables
            count: visitorCount,
            visitor_count: visitorCount,
            'template.visitor_count': visitorCount,
            
            // Page info (will be overwritten client-side)
            page_name: 'this page',
            page_url: '',
            'template.page_name': 'this page',
            'template.page_url': '',
            
            // Location (populated client-side)
            location: '',
            'template.location': '',
            
            // Icon
            icon: nativeConfig.icon || '👥',
            
            // Urgency Banner specific variables
            prefix: templateStyle === 'urgency' ? '🔥 HOT -' : '',
            message: `${peopleText} viewing right now!`,
            
            // For animated/live counter templates
            'visitors-count': visitorCount,
            
            // Style namespace variables for templates
            'style.font_size': `${designSettings.fontSize}px`,
            'style.link_color': designSettings.linkColor,
            'style.text_color': designSettings.textColor,
            'style.background_color': designSettings.backgroundColor,
            'style.border_radius': `${designSettings.borderRadius}px`,
            'style.font_family': designSettings.fontFamily,
          };
          
          const defaultMessage = `${visitorCount} ${peopleText} viewing this page`;
          
          // Build rendered message for pre-rendered template case
          const renderedMessage = (campaign.templates as any)?.html_template 
            ? renderTemplate((campaign.templates as any).html_template, templateData)
            : defaultMessage;
          
          const singleEvent = {
            id: `live_visitors_${campaign.id}_${Date.now()}`,
            event_type: 'live_visitors',
            event_data: {
              visitor_count: visitorCount,
              mode: nativeConfig.mode || 'simulated',
              template_style: templateStyle,
              campaign_id: campaign.id,
              campaign_name: campaign.name,
              has_custom_template: !!(campaign.templates as any)?.html_template,
              custom_html: (campaign.templates as any)?.html_template || null,
              icon: nativeConfig.icon || '👥',
              // Fields expected by widget.js for proper rendering
              show_location: showLocation,
              location: null, // Will be populated client-side with visitor's location
              page_name: 'this page',
              page_url: '', // Client will use actual page URL
              rendered_message: renderedMessage,
              // Pass template variables for client-side re-rendering if needed
              prefix: templateData.prefix,
              message: templateData.message,
              // Pass content alignment for widget.js
              content_alignment: designSettings.content_alignment,
            },
            // Pass design_settings at event level for widget.js to apply styles
            design_settings: designSettings,
            message_template: renderedMessage,
            created_at: new Date().toISOString(),
            campaign_id: campaign.id,
            moderation_status: 'approved',
            status: 'approved'
          };
          
          grouped[eventType] = [singleEvent];
          console.log(`[Queue Builder] Generated 1 live_visitors event for campaign ${campaign.id} with design_settings:`, designSettings);
        } else {
          grouped[eventType] = [];
          console.log(`[Queue Builder] No active live_visitors campaigns found`);
        }
      }
    } else if (eventType === 'announcement') {
      // Special handling for announcements - read from campaign's native_config for up-to-date content
      // This ensures edits to announcements are immediately reflected
      // NOTE: Announcement campaigns have campaign_type='notification' but data_sources[].provider='announcements'
      const { data: allActiveCampaigns, error: campError } = await supabase
        .from('campaigns')
        .select(`
          id, name, native_config, integration_settings, status, data_sources,
          widgets!inner (id)
        `)
        .eq('website_id', config.websiteId)
        .eq('status', 'active');
      
      // Filter for campaigns with announcements provider in data_sources
      const announcementCampaigns = (allActiveCampaigns || []).filter((c: any) => {
        const sources = Array.isArray(c.data_sources) ? c.data_sources : [];
        return sources.some((s: any) => s.provider === 'announcements');
      });
      
      console.log(`[Queue Builder] Found ${announcementCampaigns.length} announcement campaigns by data_sources provider`);
      
      if (campError) {
        console.error(`[Queue Builder] Error fetching announcement campaigns:`, campError);
        grouped[eventType] = [];
      } else if (announcementCampaigns.length > 0) {
        const announcementEvents = [];
        
        for (const campaign of announcementCampaigns) {
          // Use native_config or integration_settings for the most up-to-date content
          const announcementConfig = campaign.native_config || campaign.integration_settings || {};
          
          if (announcementConfig.title) {
            announcementEvents.push({
              id: `announcement_${campaign.id}_${Date.now()}`,
              event_type: 'announcement',
              message_template: announcementConfig.title,
              campaign_id: campaign.id,
              widget_id: (campaign.widgets as any)?.[0]?.id || config.widgetIds[0],
              event_data: {
                title: announcementConfig.title,
                message: announcementConfig.message,
                cta_text: announcementConfig.cta_text,
                cta_url: announcementConfig.cta_url,
                image_type: announcementConfig.image_type || 'emoji',
                emoji: announcementConfig.emoji,
                icon: announcementConfig.icon,
                image_url: announcementConfig.image_url,
                // NEW: Style settings from announcement config
                content_alignment: announcementConfig.content_alignment || 'top',
                button_stretch: announcementConfig.button_stretch || false,
                font_size: announcementConfig.font_size || 14,
                font_family: announcementConfig.font_family || 'system',
              },
              created_at: new Date().toISOString(),
              moderation_status: 'approved',
              status: 'approved',
            });
            console.log(`[Queue Builder] Generated announcement from campaign ${campaign.id}: "${announcementConfig.title}"`);
          }
        }
        
        grouped[eventType] = announcementEvents;
        console.log(`[Queue Builder] Generated ${announcementEvents.length} announcement events from campaigns`);
      } else {
        // Fallback: fetch from events table if no active campaigns
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
          console.log(`[Queue Builder] Fetched ${data?.length || 0} ${eventType} events from events table`);
        }
      }
    } else if (eventType === 'purchase') {
      // FIXED: For purchase events from integrations (WooCommerce, Shopify, Stripe),
      // query by website_id instead of widget_id so all WooCommerce campaigns can show events
      const { data: purchaseEvents, error } = await supabase
        .from('events')
        .select('*')
        .eq('website_id', config.websiteId)
        .eq('event_type', 'purchase')
        .eq('moderation_status', 'approved')
        .eq('status', 'approved')
        .in('source', ['woocommerce', 'shopify', 'stripe', 'manual'])
        .gte('created_at', ttlDate)
        .order('created_at', { ascending: false })
        .limit(weightConfig.max_per_queue);
      
      if (error) {
        console.error(`[Queue Builder] Error fetching purchase events:`, error);
        grouped[eventType] = [];
      } else {
        // Fetch all active purchase/WooCommerce campaigns WITH their widgets and style settings
        const { data: purchaseCampaigns } = await supabase
          .from('campaigns')
          .select('id, display_rules, data_sources, template_id')
          .eq('website_id', config.websiteId)
          .eq('status', 'active');
        
        // Find WooCommerce campaigns
        const wooCampaigns = (purchaseCampaigns || []).filter((c: any) => {
          const sources = Array.isArray(c.data_sources) ? c.data_sources : [];
          return sources.some((ds: any) => ds.provider === 'woocommerce');
        });
        
        console.log(`[Queue Builder] Found ${wooCampaigns.length} active WooCommerce campaigns`);
        
        // Fetch widgets for all WooCommerce campaigns to get their style_config
        const campaignWidgetMap: Record<string, any> = {};
        for (const camp of wooCampaigns) {
          const { data: campaignWidget } = await supabase
            .from('widgets')
            .select('id, style_config')
            .eq('campaign_id', camp.id)
            .maybeSingle();
          
          if (campaignWidget) {
            campaignWidgetMap[camp.id] = campaignWidget;
            console.log(`[Queue Builder] Found widget for campaign ${camp.id}:`, { 
              widgetId: campaignWidget.id, 
              hasStyleConfig: !!campaignWidget.style_config 
            });
          }
        }
        
        // Attach campaign design settings to each event
        const eventsWithDesign = (purchaseEvents || []).map((event: any) => {
          // Find the campaign whose widget matches this event's widget_id
          let matchingCampaign = wooCampaigns.find((c: any) => {
            const campWidget = campaignWidgetMap[c.id];
            return campWidget && campWidget.id === event.widget_id;
          }) || wooCampaigns[0];
          
          if (matchingCampaign) {
            const campaignWidget = campaignWidgetMap[matchingCampaign.id];
            // Merge display_rules from campaign with style_config from widget
            const mergedDesignSettings = {
              ...matchingCampaign.display_rules,
              ...(campaignWidget?.style_config || {}),
            };
            
            console.log(`[Queue Builder] Event ${event.id} matched campaign ${matchingCampaign.id}, design_settings:`, mergedDesignSettings);
            
            return {
              ...event,
              campaign_id: matchingCampaign.id,
              design_settings: mergedDesignSettings,
            };
          }
          return event;
        });
        
        grouped[eventType] = eventsWithDesign;
        console.log(`[Queue Builder] Fetched ${purchaseEvents?.length || 0} purchase events by website_id`);
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
 * Also adds verification badge to eligible notifications
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
    
    // Add event from selected type with verification badge
    const event = groupedEvents[selectedType][cursors[selectedType]];
    if (event) {
      // Determine if this event should show verification badge
      const showVerified = shouldShowVerificationBadge(event.event_type, event.event_data || {});
      
      // Clone event and add verification data
      const enrichedEvent = {
        ...event,
        show_verified: showVerified,
        event_data: {
          ...event.event_data,
          show_verified: showVerified,
        },
      };
      
      // Note: Verification badge is now rendered by the widget on the same line as timestamp/location
      // No longer appending to message_template to avoid duplication
      
      queue.push(enrichedEvent);
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
  
  // Log verification badge stats
  const verifiedCount = queue.filter(e => e.show_verified).length;
  console.log(`[Queue Builder] Verification badges: ${verifiedCount}/${queue.length} events`);
  
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
