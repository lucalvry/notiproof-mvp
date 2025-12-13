import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

interface TrialingUser {
  subscription_id: string;
  user_id: string;
  email: string;
  name: string;
  trial_end: string;
  plan_name: string;
  days_until_expiry: number;
}

interface EmailTemplate {
  subject: string;
  body_html: string;
  is_active: boolean;
}

// Simple template renderer for mustache-style placeholders
function renderTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return data[key] !== undefined ? String(data[key]) : `{{${key}}}`;
  });
}

// Add tracking pixel and link tracking to email HTML
function addTracking(html: string, trackingId: string, baseUrl: string): string {
  // Add tracking pixel before closing body tag
  const trackingPixel = `<img src="${baseUrl}/functions/v1/email-tracking?action=open&id=${trackingId}" width="1" height="1" style="display:none" alt="" />`;
  
  // Replace links to add click tracking
  const trackedHtml = html.replace(
    /href="(https?:\/\/[^"]+)"/g,
    (match, url) => {
      const trackedUrl = `${baseUrl}/functions/v1/email-tracking?action=click&id=${trackingId}&url=${encodeURIComponent(url)}`;
      return `href="${trackedUrl}"`;
    }
  );
  
  // Insert tracking pixel before </body> or at end
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
      console.error('BREVO_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    console.log('[Trial Notifications] Starting trial notification check...');

    // Fetch email templates from database
    const { data: templates } = await supabaseAdmin
      .from('admin_email_templates')
      .select('template_key, subject, body_html, is_active')
      .in('template_key', ['trial_3_days', 'trial_1_day', 'trial_expired']);

    const templateMap: Record<string, EmailTemplate> = {};
    for (const t of templates || []) {
      templateMap[t.template_key] = t;
    }

    // Get all trialing users with their subscription info
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select(`
        id,
        user_id,
        trial_end,
        plan:subscription_plans(name)
      `)
      .eq('status', 'trialing')
      .not('trial_end', 'is', null);

    if (subError) {
      console.error('[Trial Notifications] Error fetching subscriptions:', subError);
      throw subError;
    }

    console.log(`[Trial Notifications] Found ${subscriptions?.length || 0} trialing subscriptions`);

    const results = {
      processed: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      details: [] as any[],
    };

    for (const sub of subscriptions || []) {
      const trialEnd = new Date(sub.trial_end);
      const now = new Date();
      const diffTime = trialEnd.getTime() - now.getTime();
      const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Determine which email type to send
      let emailType: string | null = null;
      if (daysUntilExpiry === 3) {
        emailType = 'trial_3_days';
      } else if (daysUntilExpiry === 1) {
        emailType = 'trial_1_day';
      } else if (daysUntilExpiry <= 0) {
        emailType = 'trial_expired';
      }

      if (!emailType) continue;

      results.processed++;

      // Check if we already sent this notification
      const { data: existingNotification } = await supabaseAdmin
        .from('trial_email_notifications')
        .select('id')
        .eq('subscription_id', sub.id)
        .eq('email_type', emailType)
        .single();

      if (existingNotification) {
        console.log(`[Trial Notifications] Already sent ${emailType} for subscription ${sub.id}`);
        results.skipped++;
        continue;
      }

      // Get user email and name from auth
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(sub.user_id);
      
      if (authError || !authUser?.user?.email) {
        console.error(`[Trial Notifications] Could not get user info for ${sub.user_id}:`, authError);
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
      const planName = (sub.plan as any)?.name || 'Trial';

      // Generate tracking ID
      const trackingId = crypto.randomUUID();

      // Send the email using database template or fallback
      const emailResult = await sendTrialEmail(
        brevoApiKey,
        userEmail,
        userName,
        emailType,
        planName,
        daysUntilExpiry,
        templateMap[emailType],
        trackingId,
        supabaseUrl
      );

      // Log the notification with tracking ID
      const { error: insertError } = await supabaseAdmin
        .from('trial_email_notifications')
        .insert({
          subscription_id: sub.id,
          user_id: sub.user_id,
          email_type: emailType,
          status: emailResult.success ? 'sent' : 'failed',
          error_message: emailResult.error || null,
          tracking_id: trackingId,
        });

      if (insertError) {
        console.error(`[Trial Notifications] Failed to log notification:`, insertError);
      }

      if (emailResult.success) {
        console.log(`[Trial Notifications] Sent ${emailType} to ${userEmail} with tracking ${trackingId}`);
        results.sent++;
        results.details.push({ email: userEmail, type: emailType, status: 'sent', trackingId });
      } else {
        console.error(`[Trial Notifications] Failed to send ${emailType} to ${userEmail}:`, emailResult.error);
        results.failed++;
        results.details.push({ email: userEmail, type: emailType, status: 'failed', error: emailResult.error });
      }
    }

    console.log(`[Trial Notifications] Complete. Sent: ${results.sent}, Skipped: ${results.skipped}, Failed: ${results.failed}`);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Trial Notifications] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendTrialEmail(
  apiKey: string,
  email: string,
  name: string,
  emailType: string,
  planName: string,
  daysRemaining: number,
  dbTemplate: EmailTemplate | undefined,
  trackingId: string,
  baseUrl: string
): Promise<{ success: boolean; error?: string }> {
  let subject: string;
  let htmlContent: string;

  const templateData = { name, planName, daysRemaining };

  // Use database template if available and active
  if (dbTemplate?.is_active) {
    subject = renderTemplate(dbTemplate.subject, templateData);
    htmlContent = renderTemplate(dbTemplate.body_html, templateData);
  } else {
    // Fallback to hardcoded templates
    const fallbackTemplates: Record<string, { subject: string; htmlContent: string }> = {
      trial_3_days: {
        subject: `⏰ Your ${planName} trial ends in 3 days - Don't lose access!`,
        htmlContent: getTrialEmailHtml(name, planName, 3, 'warning'),
      },
      trial_1_day: {
        subject: `🚨 Last chance! Your ${planName} trial expires tomorrow`,
        htmlContent: getTrialEmailHtml(name, planName, 1, 'urgent'),
      },
      trial_expired: {
        subject: `Your ${planName} trial has ended - Upgrade to continue`,
        htmlContent: getTrialEmailHtml(name, planName, 0, 'expired'),
      },
    };

    const template = fallbackTemplates[emailType];
    if (!template) {
      return { success: false, error: 'Unknown email type' };
    }
    subject = template.subject;
    htmlContent = template.htmlContent;
  }

  // Add tracking to email
  const trackedHtml = addTracking(htmlContent, trackingId, baseUrl);

  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'NotiProof', email: 'notifications@notiproof.com' },
        to: [{ email, name }],
        subject,
        htmlContent: trackedHtml,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Brevo API error: ${response.status} - ${errorText}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function getTrialEmailHtml(name: string, planName: string, daysRemaining: number, urgency: 'warning' | 'urgent' | 'expired'): string {
  const colors = {
    warning: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' },
    urgent: { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' },
    expired: { bg: '#F3F4F6', border: '#6B7280', text: '#374151' },
  };

  const color = colors[urgency];
  
  const headlineMap = {
    warning: `Your trial ends in 3 days`,
    urgent: `Last day of your trial!`,
    expired: `Your trial has ended`,
  };

  const messageMap = {
    warning: `You've been making great progress with NotiProof! Your ${planName} trial will expire in 3 days. Upgrade now to keep your social proof notifications running and continue converting visitors into customers.`,
    urgent: `This is your last chance! Your ${planName} trial expires tomorrow. Don't let your hard work go to waste - upgrade now to maintain your conversion momentum.`,
    expired: `Your ${planName} trial has ended. Your social proof notifications are now paused. Upgrade today to reactivate them and get back to converting more visitors!`,
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headlineMap[urgency]}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827;">NotiProof</h1>
            </td>
          </tr>
          
          <!-- Alert Banner -->
          <tr>
            <td style="padding: 24px 32px 0;">
              <div style="background-color: ${color.bg}; border-left: 4px solid ${color.border}; padding: 16px; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${color.text};">
                  ${headlineMap[urgency]}
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 24px 32px;">
              <p style="margin: 0 0 16px; font-size: 16px; color: #374151; line-height: 1.6;">
                Hi ${name},
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; color: #374151; line-height: 1.6;">
                ${messageMap[urgency]}
              </p>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="https://app.notiproof.com/settings/billing" style="display: inline-block; padding: 14px 32px; background-color: #4F46E5; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
                  ${urgency === 'expired' ? 'Reactivate Now' : 'Upgrade Now'}
                </a>
              </div>
              
              <!-- Features Reminder -->
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-top: 24px;">
                <p style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #374151;">
                  What you'll keep with an upgrade:
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #6b7280; font-size: 14px; line-height: 1.8;">
                  <li>Social proof notifications that boost conversions</li>
                  <li>Real-time visitor activity alerts</li>
                  <li>Integration with Stripe, Shopify, and more</li>
                  <li>Advanced analytics and A/B testing</li>
                  <li>Priority customer support</li>
                </ul>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #9ca3af;">
                Questions? Reply to this email or visit our <a href="https://app.notiproof.com/help" style="color: #4F46E5;">help center</a>.
              </p>
              <p style="margin: 16px 0 0; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} NotiProof. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
