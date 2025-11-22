import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { getCorsHeaders } from "../_shared/cors.ts";

interface SubmissionRequest {
  testimonial_id: string;
  form_id: string;
  email?: string;
  name?: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { testimonial_id, form_id, email, name, has_video }: SubmissionRequest & { has_video?: boolean } = await req.json();

    console.log(`[process-testimonial-submission] Processing submission ${testimonial_id} for form ${form_id}`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Load form configuration
    const { data: formConfig, error: formError } = await supabase
      .from('testimonial_forms')
      .select('reward_config, email_config')
      .eq('id', form_id)
      .single();

    if (formError) {
      console.error('[process-testimonial-submission] Error loading form:', formError);
      throw new Error('Failed to load form configuration');
    }

    let rewardData = null;

    // 2. Check if rewards are enabled
    if (formConfig?.reward_config?.enabled) {
      const rewardConfig = formConfig.reward_config;

      // Check if reward is limited to video submissions
      if (rewardConfig.limit_to_video && !has_video) {
        console.log('[process-testimonial-submission] Reward limited to video, skipping');
      } else {
        // 3. Generate reward based on type
        if (rewardConfig.type === 'coupon') {
          // Generate or use fixed coupon code
          const couponCode = rewardConfig.value || generateCouponCode();
          
          rewardData = {
            type: 'coupon',
            code: couponCode,
          };

          console.log(`[process-testimonial-submission] Generated coupon: ${couponCode}`);
        } else if (rewardConfig.type === 'link') {
          // Use configured redirect URL
          rewardData = {
            type: 'link',
            url: rewardConfig.value,
          };

          console.log(`[process-testimonial-submission] Prepared link: ${rewardConfig.value}`);
        }

        // Store reward in testimonial metadata
        if (rewardData) {
          const { error: updateError } = await supabase
            .from('testimonials')
            .update({
              metadata: supabase.rpc('jsonb_set', {
                target: 'metadata',
                path: '{reward}',
                value: JSON.stringify(rewardData),
              }),
            })
            .eq('id', testimonial_id);

          if (updateError) {
            console.error('[process-testimonial-submission] Error storing reward:', updateError);
          }
        }
      }
    }

    // 4. Send thank you email (if configured and BREVO_API_KEY exists)
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    if (email && brevoApiKey && formConfig?.email_config?.thank_you_enabled) {
      try {
        const emailSubject = formConfig.email_config.thank_you_subject || 'Thank you for your testimonial!';
        const emailBody = formConfig.email_config.thank_you_body || 
          `Hi ${name},\n\nThank you for sharing your testimonial with us!\n\n${rewardData ? `Here's your reward: ${rewardData.type === 'coupon' ? rewardData.code : rewardData.url}` : ''}`;

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
            subject: emailSubject,
            htmlContent: emailBody.replace(/\n/g, '<br>'),
          }),
        });

        if (!emailResponse.ok) {
          console.error('[process-testimonial-submission] Email send failed:', await emailResponse.text());
        } else {
          console.log('[process-testimonial-submission] Thank you email sent');
        }
      } catch (emailError) {
        console.error('[process-testimonial-submission] Email error:', emailError);
      }
    }

    // 5. Update invite status if exists
    if (email) {
      await supabase
        .from('testimonial_invites')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
        .eq('email', email)
        .eq('form_id', form_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Submission processed successfully",
        testimonial_id,
        reward: rewardData,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[process-testimonial-submission] Error:", error);
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

/**
 * Generate a random coupon code
 */
function generateCouponCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
