import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MigrationResult {
  success: boolean;
  migrated: number;
  skipped: number;
  errors: Array<{ event_id: string; error: string }>;
}

// Normalize event data to canonical format
function normalizeEventData(event: any): any {
  const provider = event.integration_type || 'manual';
  const eventData = event.event_data || {};

  const normalized: any = {
    'meta.provider': provider,
    'meta.event_type': event.event_type,
    'meta.timestamp': event.created_at,
  };

  // Provider-specific normalization
  switch (provider) {
    case 'shopify':
      normalized['template.product_name'] = eventData.line_items?.[0]?.title || eventData.title;
      normalized['template.customer_name'] = eventData.customer?.first_name || eventData.billing_address?.first_name;
      normalized['template.customer_location'] = eventData.billing_address?.city || eventData.customer?.default_address?.city;
      normalized['template.price'] = eventData.total_price || eventData.line_items?.[0]?.price;
      normalized['template.image_url'] = eventData.line_items?.[0]?.product?.image?.src;
      break;

    case 'stripe':
      normalized['template.product_name'] = eventData.description || eventData.lines?.data?.[0]?.description;
      normalized['template.customer_name'] = eventData.billing_details?.name || eventData.customer_details?.name;
      normalized['template.customer_email'] = eventData.billing_details?.email || eventData.customer_details?.email;
      normalized['template.amount'] = eventData.amount || eventData.amount_total;
      normalized['template.currency'] = eventData.currency;
      break;

    case 'testimonials':
      normalized['template.author_name'] = eventData.author_name;
      normalized['template.author_email'] = eventData.author_email;
      normalized['template.author_avatar'] = eventData.author_avatar_url;
      normalized['template.rating'] = eventData.rating;
      normalized['template.message'] = eventData.message;
      normalized['template.image_url'] = eventData.image_url;
      normalized['template.video_url'] = eventData.video_url;
      break;

    case 'announcements':
      normalized['template.message'] = eventData.message || event.message_template;
      normalized['template.title'] = eventData.title;
      break;

    case 'instant_capture':
      normalized['template.visitor_count'] = eventData.visitor_count || 1;
      normalized['template.action'] = eventData.action || 'viewing';
      break;

    case 'live_visitors':
      normalized['template.visitor_name'] = eventData.visitor_name || event.user_name;
      normalized['template.visitor_location'] = eventData.visitor_location || event.user_location;
      normalized['template.page_url'] = eventData.page_url || event.page_url;
      break;

    default:
      // Generic fallback
      normalized['template.message'] = event.message_template || eventData.message || event.event_type;
      normalized['template.user_name'] = event.user_name;
      normalized['template.user_location'] = event.user_location;
  }

  return {
    event_id: event.id,
    provider,
    provider_event_type: event.event_type,
    timestamp: event.created_at,
    payload: eventData,
    normalized,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { dryRun = true, batchSize = 100, offset = 0 } = await req.json().catch(() => ({
      dryRun: true,
      batchSize: 100,
      offset: 0,
    }));

    const result: MigrationResult = {
      success: true,
      migrated: 0,
      skipped: 0,
      errors: [],
    };

    // Fetch events that need canonical format
    const { data: events, error: fetchError } = await supabase
      .from('events')
      .select('*')
      .or('canonical_event.is.null,canonical_event.eq.{}')
      .range(offset, offset + batchSize - 1)
      .order('created_at', { ascending: true });

    if (fetchError) throw fetchError;

    console.log(`Processing ${events?.length || 0} events (offset: ${offset})`);

    for (const event of events || []) {
      try {
        // Skip if already has canonical format
        if (event.canonical_event && Object.keys(event.canonical_event).length > 0) {
          result.skipped++;
          continue;
        }

        const canonicalEvent = normalizeEventData(event);

        if (!dryRun) {
          const { error: updateError } = await supabase
            .from('events')
            .update({
              canonical_event: canonicalEvent,
            })
            .eq('id', event.id);

          if (updateError) {
            result.errors.push({
              event_id: event.id,
              error: updateError.message,
            });
            continue;
          }
        }

        result.migrated++;
      } catch (error) {
        result.errors.push({
          event_id: event.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const { count } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .or('canonical_event.is.null,canonical_event.eq.{}');

    return new Response(
      JSON.stringify({
        ...result,
        dryRun,
        batchSize,
        offset,
        remainingEvents: (count || 0) - offset - batchSize,
        message: dryRun
          ? 'Dry run complete - no changes made. Set dryRun=false to apply changes.'
          : 'Batch migration complete',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
