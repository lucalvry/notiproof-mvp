import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { getCorsHeaders } from "../_shared/cors.ts";

interface BulkInviteRequest {
  form_id: string;
  recipients: Array<{
    email: string;
    name?: string;
    company?: string;
  }>;
  template_id?: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { form_id, recipients, template_id }: BulkInviteRequest = await req.json();

    console.log(`[send-bulk-testimonial-invites] Sending ${recipients.length} invites for form ${form_id}`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Load form details
    const { data: form, error: formError } = await supabase
      .from('testimonial_forms')
      .select('name, slug, website_id, user_id')
      .eq('id', form_id)
      .single();

    if (formError) throw new Error('Form not found');

    // Load email template
    let template;
    if (template_id) {
      const { data } = await supabase
        .from('testimonial_email_templates')
        .select('*')
        .eq('id', template_id)
        .single();
      template = data;
    } else {
      const { data } = await supabase
        .from('testimonial_email_templates')
        .select('*')
        .eq('template_type', 'invite')
        .eq('template_name', 'default')
        .limit(1)
        .single();
      template = data;
    }

    if (!template) {
      throw new Error('Email template not found');
    }

    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    if (!brevoApiKey) {
      throw new Error('BREVO_API_KEY not configured');
    }

    const formUrl = `${supabaseUrl.replace('https://', 'https://app.')}/collect/${form.slug}`;

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // Send emails in batches to avoid rate limiting
    for (const recipient of recipients) {
      try {
        // Replace placeholders
        const subject = template.subject
          .replace(/\{name\}/g, recipient.name || 'there')
          .replace(/\{form_name\}/g, form.name);

        const body = template.body
          .replace(/\{name\}/g, recipient.name || 'there')
          .replace(/\{form_name\}/g, form.name)
          .replace(/\{form_url\}/g, formUrl);

        const ctaText = template.cta_text || 'Share Your Feedback';

        const emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="white-space: pre-wrap;">${body.replace(/\n/g, '<br>')}</div>
            <div style="margin-top: 30px; text-align: center;">
              <a href="${formUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                ${ctaText}
              </a>
            </div>
          </div>
        `;

        // Send via Brevo
        const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'api-key': brevoApiKey,
          },
          body: JSON.stringify({
            sender: { email: 'noreply@notiproof.com', name: 'NotiProof' },
            to: [{ email: recipient.email, name: recipient.name }],
            subject,
            htmlContent: emailHtml,
          }),
        });

        if (emailResponse.ok) {
          sent++;
          // Track invite
          await supabase.from('testimonial_invites').insert({
            form_id,
            email: recipient.email,
            status: 'sent',
            sent_at: new Date().toISOString(),
          });
        } else {
          failed++;
          const errorText = await emailResponse.text();
          errors.push(`${recipient.email}: ${errorText}`);
          console.error(`[send-bulk-testimonial-invites] Failed for ${recipient.email}:`, errorText);
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${recipient.email}: ${errorMessage}`);
        console.error(`[send-bulk-testimonial-invites] Error for ${recipient.email}:`, error);
      }
    }

    console.log(`[send-bulk-testimonial-invites] Complete: ${sent} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${sent} invitations`,
        form_id,
        count: recipients.length,
        sent,
        failed,
        errors: failed > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[send-bulk-testimonial-invites] Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
