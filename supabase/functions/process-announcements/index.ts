import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('[process-announcements] Starting scheduled announcement processing...')

    // 1. Get active announcement campaigns
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'active');
    
    if (campaignsError) {
      console.error('[process-announcements] Error fetching campaigns:', campaignsError)
      throw campaignsError
    }
    
    // Filter for announcement campaigns
    const announcementCampaigns = campaigns?.filter(c => {
      const sources = c.data_sources as any[];
      return sources && sources.some(s => s.provider === 'announcements');
    }) || [];

    if (announcementCampaigns.length === 0) {
      console.log('[process-announcements] No active announcement campaigns found')
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`[process-announcements] Found ${campaigns.length} active announcement campaigns`)

    let processed = 0

    for (const campaign of campaigns) {
      const nativeConfig = campaign.native_config as any
      
      // Check if announcement should be shown now
      if (!shouldShowAnnouncement(nativeConfig)) {
        console.log(`[process-announcements] Skipping campaign ${campaign.id} - not scheduled for now`)
        continue
      }

      console.log(`[process-announcements] Processing campaign ${campaign.id}`)

      // First, get the widget for this campaign
      const { data: widget, error: widgetError } = await supabase
        .from('widgets')
        .select('id')
        .eq('campaign_id', campaign.id)
        .eq('status', 'active')
        .single()

      if (widgetError || !widget) {
        console.error(`[process-announcements] No active widget found for campaign ${campaign.id}:`, widgetError)
        continue
      }

      console.log(`[process-announcements] Found widget ${widget.id} for campaign ${campaign.id}`)
      console.log(`[process-announcements] Native config for campaign ${campaign.id}:`, JSON.stringify(nativeConfig, null, 2))

      // Treat undefined schedule_type as 'instant'
      const scheduleType = nativeConfig.schedule_type || 'instant'
      console.log(`[process-announcements] Schedule type for campaign ${campaign.id}: ${scheduleType}`)

      // For 'scheduled' announcements, check if within active time window
      if (scheduleType === 'scheduled') {
        if (!shouldShowAnnouncement(nativeConfig)) {
          console.log(`[process-announcements] Skipping campaign ${campaign.id} - not within scheduled time window`)
          continue
        }
      }

      // Check if an event already exists for this campaign (prevent duplicates)
      // For instant: check last 24 hours, for recurring: check last hour
      const lookbackMs = scheduleType === 'instant' ? 86400000 : 3600000 // 24h for instant, 1h for recurring
      const { data: existingEvents, error: checkError } = await supabase
        .from('events')
        .select('id, created_at')
        .eq('widget_id', widget.id)
        .eq('event_type', 'announcement')
        .eq('website_id', campaign.website_id)
        .gte('created_at', new Date(Date.now() - lookbackMs).toISOString())
      
      if (checkError) {
        console.error(`[process-announcements] Error checking existing events for campaign ${campaign.id}:`, checkError)
      }

      // For instant announcements (or undefined), don't create duplicates within 24h
      if ((scheduleType === 'instant' || !nativeConfig.schedule_type) && existingEvents && existingEvents.length > 0) {
        console.log(`[process-announcements] Skipping - instant announcement already exists for campaign ${campaign.id} (${existingEvents.length} events found in last 24h)`)
        continue
      }

      // For recurring, check if we've already created an event in this time window (last hour)
      if (scheduleType === 'recurring' && existingEvents && existingEvents.length > 0) {
        console.log(`[process-announcements] Skipping - recurring announcement already created recently for campaign ${campaign.id} (${existingEvents.length} events found in last hour)`)
        continue
      }

      // STEP 3 FIX: Add defensive checks for CTA data
      const ctaText = nativeConfig.cta_text || nativeConfig.ctaText || '';
      const ctaUrl = nativeConfig.cta_url || nativeConfig.ctaUrl || '';
      
      // Log CTA extraction
      console.log(`[process-announcements] CTA extraction - Text: "${ctaText}", URL: "${ctaUrl}"`)
      
      if (!ctaText || !ctaUrl) {
        console.warn(`[process-announcements] WARNING: Campaign ${campaign.id} missing CTA data. cta_text: "${ctaText}", cta_url: "${ctaUrl}"`)
      }

      // STEP 4 FIX: Add defensive checks for title and message data
      const title = nativeConfig.title || '';
      const message = nativeConfig.message || '';
      
      // Log title/message extraction
      console.log(`[process-announcements] Title/Message extraction - Title: "${title}", Message: "${message}"`)
      
      if (!title) {
        console.warn(`[process-announcements] WARNING: Campaign ${campaign.id} missing title`)
      }
      
      if (!message) {
        console.warn(`[process-announcements] WARNING: Campaign ${campaign.id} missing message. This will prevent subtext from showing.`)
      }

      // Create event for this announcement with ALL configuration data
      const eventData = {
        title: title,
        message: message,
        cta_text: ctaText,
        cta_url: ctaUrl,
        // Include image configuration
        image_type: nativeConfig.image_type || 'icon',
        emoji: nativeConfig.emoji || '📢',
        icon: nativeConfig.icon || '📢',
        image_url: nativeConfig.image_url || '',
        priority: nativeConfig.priority || 5,
        variables: nativeConfig.variables || {}
      };

      console.log(`[process-announcements] Creating event with data:`, JSON.stringify(eventData, null, 2))
      console.log(`[process-announcements] Data completeness check:`)
      console.log(`  - Has title: ${!!eventData.title} (length: ${eventData.title?.length || 0})`)
      console.log(`  - Has message: ${!!eventData.message} (length: ${eventData.message?.length || 0})`)
      console.log(`  - Has cta_text: ${!!eventData.cta_text} (length: ${eventData.cta_text?.length || 0})`)
      console.log(`  - Has cta_url: ${!!eventData.cta_url} (length: ${eventData.cta_url?.length || 0})`)

      const { error } = await supabase
        .from('events')
        .insert({
          widget_id: widget.id,
          website_id: campaign.website_id,
          event_type: 'announcement',
          source: 'manual',
          event_data: eventData,
          message_template: nativeConfig.title || 'Announcement',
          user_name: nativeConfig.title || 'Announcement',
          user_location: '',
          status: 'approved',
          moderation_status: 'approved',
          expires_at: nativeConfig.schedule?.end_date || nativeConfig.end_date || null
        })

      if (error) {
        console.error(`[process-announcements] Error creating event for campaign ${campaign.id}:`, error)
        console.error(`[process-announcements] Failed event_data:`, JSON.stringify(eventData, null, 2))
      } else {
        processed++
        console.log(`[process-announcements] ✅ Successfully created event for campaign ${campaign.id}`)
        console.log(`[process-announcements] ✅ Event data saved to database:`)
        console.log(`  - Title: "${eventData.title}"`)
        console.log(`  - Message: "${eventData.message}"`)
        console.log(`  - CTA Text: "${eventData.cta_text}"`)
        console.log(`  - CTA URL: "${eventData.cta_url}"`)
        console.log(`  - Image Type: "${eventData.image_type}"`)
        console.log(`  - Icon/Emoji: "${eventData.icon || eventData.emoji}"`)
      }
    }

    console.log(`[process-announcements] Processed ${processed} announcements`)
    return new Response(JSON.stringify({ processed, total_campaigns: campaigns.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[process-announcements] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

function shouldShowAnnouncement(config: any): boolean {
  const now = new Date()
  
  console.log('[shouldShowAnnouncement] Checking schedule for:', config.schedule_type)
  
  if (config.schedule_type === 'instant') {
    return true
  }
  
  if (config.schedule_type === 'scheduled') {
    const start = new Date(config.start_date)
    const end = config.end_date ? new Date(config.end_date) : null
    
    if (now < start) {
      console.log('[shouldShowAnnouncement] Not started yet')
      return false
    }
    if (end && now > end) {
      console.log('[shouldShowAnnouncement] Already ended')
      return false
    }
    return true
  }
  
  if (config.schedule_type === 'recurring') {
    const recurrence = config.recurrence || {}
    const dayOfWeek = now.getDay()
    const timeOfDay = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    
    if (recurrence.pattern === 'weekly') {
      if (!recurrence.days_of_week?.includes(dayOfWeek)) {
        console.log('[shouldShowAnnouncement] Not scheduled for today')
        return false
      }
    }
    
    if (recurrence.time_of_day) {
      const [targetHour, targetMin] = recurrence.time_of_day.split(':').map(Number)
      const [currentHour, currentMin] = timeOfDay.split(':').map(Number)
      
      // Allow 5-minute window
      const targetMinutes = targetHour * 60 + targetMin
      const currentMinutes = currentHour * 60 + currentMin
      const diff = Math.abs(targetMinutes - currentMinutes)
      
      if (diff > 5) {
        console.log('[shouldShowAnnouncement] Outside time window')
        return false
      }
    }
    
    return true
  }
  
  return false
}

function replaceVariables(template: string, variables: Record<string, string> = {}): string {
  let result = template
  
  // Replace {{now}} with current date
  result = result.replace(/\{\{now\}\}/g, new Date().toLocaleDateString())
  
  // Replace custom variables - check if variables exists and is not null
  if (variables && typeof variables === 'object') {
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
    }
  }
  
  return result
}
