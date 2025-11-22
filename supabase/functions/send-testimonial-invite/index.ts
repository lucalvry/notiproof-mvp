import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { getCorsHeaders } from "../_shared/cors.ts";

interface InviteRequest {
  form_id: string;
  email: string;
  name?: string;
  template_id?: string;
  is_test?: boolean;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { form_id, email, name, template_id, is_test }: InviteRequest = await req.json();

    console.log(`[send-testimonial-invite] Sending invite for form ${form_id} to ${email}`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Load form details
    const { data: form, error: formError } = await supabase
      .from('testimonial_forms')
      .select('name, slug, website_id, user_id')
      .eq('id', form_id)
      .single();

    if (formError) throw new Error('Form not found');

    // 2. Load email template
    let template;
    if (template_id) {
      const { data } = await supabase
        .from('testimonial_email_templates')
        .select('*')
        .eq('id', template_id)
        .single();
      template = data;
    } else {
      // Load default invite template
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

    // 3. Generate form URL
    const formUrl = `${supabaseUrl.replace('https://', 'https://app.')}/collect/${form.slug}`;

    // 4. Replace placeholders
    const subject = template.subject
      .replace(/\{name\}/g, name || 'there')
      .replace(/\{form_name\}/g, form.name);

    const body = template.body
      .replace(/\{name\}/g, name || 'there')
      .replace(/\{form_name\}/g, form.name)
      .replace(/\{form_url\}/g, formUrl);

    const ctaText = template.cta_text || 'Share Your Feedback';

    // 5. Send email via Brevo
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    if (!brevoApiKey) {
      throw new Error('BREVO_API_KEY not configured');
    }

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

    const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': brevoApiKey,
      },
      body: JSON.stringify({
        sender: { email: 'noreply@notiproof.com', name: 'NotiProof' },
        to: [{ email, name }],
        subject,
        htmlContent: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('[send-testimonial-invite] Email send failed:', errorText);
      throw new Error('Failed to send email');
    }

    // 6. Track invite (skip for test emails)
    if (!is_test) {
      await supabase.from('testimonial_invites').insert({
        form_id,
        email,
        status: 'sent',
        sent_at: new Date().toISOString(),
      });
    }

    console.log('[send-testimonial-invite] Email sent successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invitation sent successfully",
        form_id,
        email,
        tracking_link: formUrl,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[send-testimonial-invite] Error:", error);
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
