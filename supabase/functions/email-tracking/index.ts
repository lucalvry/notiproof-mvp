import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 1x1 transparent GIF
const TRACKING_PIXEL = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
  0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
  0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
  0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action'); // 'open' or 'click'
    const trackingId = url.searchParams.get('id');
    const redirectUrl = url.searchParams.get('url');

    if (!trackingId || !action) {
      console.log('[Email Tracking] Missing tracking ID or action');
      return new Response('Invalid request', { status: 400 });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`[Email Tracking] ${action} event for tracking ID: ${trackingId}`);

    if (action === 'open') {
      // Update trial_email_notifications - set opened_at and increment open_count
      const { data: existing } = await supabaseAdmin
        .from('trial_email_notifications')
        .select('id, open_count')
        .eq('tracking_id', trackingId)
        .single();

      if (existing) {
        await supabaseAdmin
          .from('trial_email_notifications')
          .update({
            opened_at: new Date().toISOString(),
            open_count: (existing.open_count || 0) + 1,
          })
          .eq('tracking_id', trackingId);
      }

      // Also try winback campaigns
      await supabaseAdmin
        .from('winback_email_campaigns')
        .update({
          opened_at: new Date().toISOString(),
          status: 'opened',
        })
        .eq('tracking_id', trackingId)
        .is('opened_at', null);

      // Return tracking pixel
      return new Response(TRACKING_PIXEL, {
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }

    if (action === 'click') {
      // Update click tracking for trial emails
      const { data: existing } = await supabaseAdmin
        .from('trial_email_notifications')
        .select('id, click_count')
        .eq('tracking_id', trackingId)
        .single();

      if (existing) {
        await supabaseAdmin
          .from('trial_email_notifications')
          .update({
            clicked_at: new Date().toISOString(),
            click_count: (existing.click_count || 0) + 1,
          })
          .eq('tracking_id', trackingId);
      }

      // Also try winback campaigns
      await supabaseAdmin
        .from('winback_email_campaigns')
        .update({
          clicked_at: new Date().toISOString(),
          status: 'clicked',
        })
        .eq('tracking_id', trackingId);

      // Redirect to the actual URL
      if (redirectUrl) {
        return new Response(null, {
          status: 302,
          headers: {
            'Location': redirectUrl,
            ...corsHeaders,
          },
        });
      }

      return new Response('Click tracked', { status: 200 });
    }

    return new Response('Invalid action', { status: 400 });

  } catch (error) {
    console.error('[Email Tracking] Error:', error);
    // Still return pixel for opens to not break email display
    return new Response(TRACKING_PIXEL, {
      headers: { 'Content-Type': 'image/gif' },
    });
  }
});
