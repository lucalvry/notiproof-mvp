import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

interface CancelledSubscription {
  id: string;
  user_id: string;
  cancelled_at: string;
  plan: { name: string } | null;
}

// Simple template renderer
function renderTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return data[key] !== undefined ? String(data[key]) : `{{${key}}}`;
  });
}

// Add tracking to email HTML
function addTracking(html: string, trackingId: string, baseUrl: string): string {
  const trackingPixel = `<img src="${baseUrl}/functions/v1/email-tracking?action=open&id=${trackingId}" width="1" height="1" style="display:none" alt="" />`;
  
  const trackedHtml = html.replace(
    /href="(https?:\/\/[^"]+)"/g,
    (match, url) => {
      const trackedUrl = `${baseUrl}/functions/v1/email-tracking?action=click&id=${trackingId}&url=${encodeURIComponent(url)}`;
      return `href="${trackedUrl}"`;
    }
  );
  
  if (trackedHtml.includes('</body>')) {
    return trackedHtml.replace('</body>', `${trackingPixel}</body>`);
  }
  return trackedHtml + trackingPixel;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    if (!brevoApiKey) {
      console.error('[Win-Back] BREVO_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    console.log('[Win-Back] Starting win-back email campaign check...');

    // Fetch win-back templates from database
    const { data: templates } = await supabaseAdmin
      .from('admin_email_templates')
      .select('template_key, subject, body_html, is_active')
      .like('template_key', 'winback_%');

    const templateMap: Record<string, any> = {};
    for (const t of templates || []) {
      templateMap[t.template_key] = t;
    }

    // Get cancelled or expired subscriptions
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select(`
        id,
        user_id,
        cancelled_at,
        status,
        plan:subscription_plans(name)
      `)
      .in('status', ['cancelled', 'expired'])
      .not('cancelled_at', 'is', null)
      .order('cancelled_at', { ascending: false });

    if (subError) {
      console.error('[Win-Back] Error fetching subscriptions:', subError);
      throw subError;
    }

    console.log(`[Win-Back] Found ${subscriptions?.length || 0} cancelled/expired subscriptions`);

    const results = {
      processed: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      details: [] as any[],
    };

    const now = new Date();

    for (const sub of subscriptions || []) {
      const cancelledAt = new Date(sub.cancelled_at);
      const daysSinceCancellation = Math.floor((now.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60 * 24));

      // Determine which email to send based on days since cancellation
      let templateKey: string | null = null;
      let emailSequence = 0;

      if (daysSinceCancellation === 1) {
        templateKey = 'winback_day_1';
        emailSequence = 1;
      } else if (daysSinceCancellation === 3) {
        templateKey = 'winback_day_3';
        emailSequence = 2;
      } else if (daysSinceCancellation === 7) {
        templateKey = 'winback_day_7';
        emailSequence = 3;
      }

      if (!templateKey) continue;

      results.processed++;

      // Check if we already sent this email in the sequence
      const { data: existingCampaign } = await supabaseAdmin
        .from('winback_email_campaigns')
        .select('id')
        .eq('subscription_id', sub.id)
        .eq('email_sequence', emailSequence)
        .single();

      if (existingCampaign) {
        console.log(`[Win-Back] Already sent sequence ${emailSequence} for subscription ${sub.id}`);
        results.skipped++;
        continue;
      }

      // Get user email and name
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(sub.user_id);
      
      if (authError || !authUser?.user?.email) {
        console.error(`[Win-Back] Could not get user info for ${sub.user_id}:`, authError);
        results.failed++;
        continue;
      }

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('name')
        .eq('id', sub.user_id)
        .single();

      const userName = profile?.name || authUser.user.email.split('@')[0];
      const userEmail = authUser.user.email;
      const planName = (sub.plan as any)?.name || 'NotiProof';

      const trackingId = crypto.randomUUID();
      const template = templateMap[templateKey];

      if (!template?.is_active) {
        console.log(`[Win-Back] Template ${templateKey} not active, skipping`);
        results.skipped++;
        continue;
      }

      // Render template
      const templateData = {
        name: userName,
        planName,
        discountCode: emailSequence === 3 ? 'COMEBACK30' : 'COMEBACK20',
      };

      const subject = renderTemplate(template.subject, templateData);
      let htmlContent = renderTemplate(template.body_html, templateData);
      htmlContent = addTracking(htmlContent, trackingId, supabaseUrl);

      // Send email
      try {
        const response = await fetch(BREVO_API_URL, {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': brevoApiKey,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            sender: { name: 'NotiProof', email: 'notifications@notiproof.com' },
            to: [{ email: userEmail, name: userName }],
            subject,
            htmlContent,
          }),
        });

        const success = response.ok;
        const errorText = success ? null : await response.text();

        // Log the campaign
        await supabaseAdmin
          .from('winback_email_campaigns')
          .insert({
            subscription_id: sub.id,
            user_id: sub.user_id,
            email: userEmail,
            campaign_type: sub.status,
            email_sequence: emailSequence,
            template_key: templateKey,
            tracking_id: trackingId,
            status: success ? 'sent' : 'failed',
            sent_at: success ? new Date().toISOString() : null,
            error_message: errorText,
            metadata: { planName, daysSinceCancellation },
          });

        if (success) {
          console.log(`[Win-Back] Sent ${templateKey} to ${userEmail}`);
          results.sent++;
          results.details.push({ email: userEmail, template: templateKey, status: 'sent' });
        } else {
          console.error(`[Win-Back] Failed to send ${templateKey} to ${userEmail}:`, errorText);
          results.failed++;
          results.details.push({ email: userEmail, template: templateKey, status: 'failed', error: errorText });
        }
      } catch (error) {
        console.error(`[Win-Back] Error sending email:`, error);
        results.failed++;
      }
    }

    console.log(`[Win-Back] Complete. Sent: ${results.sent}, Skipped: ${results.skipped}, Failed: ${results.failed}`);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Win-Back] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
