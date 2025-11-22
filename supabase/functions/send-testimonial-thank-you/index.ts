import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { getCorsHeaders } from "../_shared/cors.ts";

interface ThankYouRequest {
  testimonial_id: string;
  email: string;
  name?: string;
  reward?: string;
  template_id?: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { testimonial_id, email, name, reward, template_id }: ThankYouRequest = await req.json();

    console.log(`[send-testimonial-thank-you] Sending thank you for testimonial ${testimonial_id} to ${email}`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Load testimonial details
    const { data: testimonial, error: testimonialError } = await supabase
      .from('testimonials')
      .select('*, testimonial_forms(name, user_id, website_id)')
      .eq('id', testimonial_id)
      .single();

    if (testimonialError) throw new Error('Testimonial not found');

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
      // Load default thank you template
      const { data } = await supabase
        .from('testimonial_email_templates')
        .select('*')
        .eq('template_type', 'thank_you')
        .eq('template_name', 'default')
        .limit(1)
        .single();
      template = data;
    }

    if (!template) {
      throw new Error('Email template not found');
    }

    // 3. Replace placeholders
    const subject = template.subject
      .replace(/\{name\}/g, name || 'there')
      .replace(/\{reward_code\}/g, reward || '')
      .replace(/\{reward_url\}/g, reward || '');

    const body = template.body
      .replace(/\{name\}/g, name || 'there')
      .replace(/\{reward_code\}/g, reward || '')
      .replace(/\{reward_url\}/g, reward || '');

    // 4. Send email via Brevo
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    if (!brevoApiKey) {
      throw new Error('BREVO_API_KEY not configured');
    }

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="white-space: pre-wrap;">${body.replace(/\n/g, '<br>')}</div>
        ${reward ? `
          <div style="margin-top: 30px; padding: 20px; background: #f3f4f6; border-radius: 8px; text-align: center;">
            <h3 style="margin: 0 0 10px 0; color: #111827;">Your Reward</h3>
            <div style="font-size: 24px; font-weight: bold; color: #6366f1; margin: 10px 0;">
              ${reward}
            </div>
          </div>
        ` : ''}
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
      console.error('[send-testimonial-thank-you] Email send failed:', errorText);
      throw new Error('Failed to send email');
    }

    console.log('[send-testimonial-thank-you] Email sent successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: "Thank you email sent successfully",
        testimonial_id,
        email,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[send-testimonial-thank-you] Error:", error);
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
