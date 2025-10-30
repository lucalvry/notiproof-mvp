import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, userId } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Checking rate limits for: ${email}`);

    // Check rate limits (5 emails per hour)
    const { data: recentSends } = await supabase
      .from('email_send_log')
      .select('sent_at, status')
      .eq('recipient_email', email)
      .eq('email_type', 'confirmation')
      .gte('sent_at', new Date(Date.now() - 3600000).toISOString())
      .order('sent_at', { ascending: false });

    if (recentSends && recentSends.length >= 5) {
      const oldestSend = recentSends[recentSends.length - 1];
      const retryAfter = new Date(new Date(oldestSend.sent_at).getTime() + 3600000);
      
      await supabase.from('email_send_log').insert({
        recipient_email: email,
        email_type: 'confirmation',
        status: 'rate_limited',
        error_message: 'Too many requests',
        retry_after: retryAfter.toISOString()
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          message: `Please wait until ${retryAfter.toLocaleTimeString()} before requesting another email.`,
          retryAfter: retryAfter.toISOString()
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating confirmation link for: ${email}`);

    // Generate email confirmation link
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email: email,
      options: {
        redirectTo: `${req.headers.get('origin')}/websites`,
      }
    });

    if (linkError) {
      console.error('Error generating confirmation link:', linkError);
      
      await supabase.from('email_send_log').insert({
        recipient_email: email,
        email_type: 'confirmation',
        status: 'failed',
        error_message: linkError.message
      });
      
      throw linkError;
    }

    const confirmationLink = linkData.properties?.action_link;

    // Send email via Brevo API
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    if (!brevoApiKey) {
      throw new Error('BREVO_API_KEY not configured');
    }

    console.log(`Sending confirmation email via Brevo to: ${email}`);

    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'NotiProof',
          email: 'no-reply@notiproof.com',
        },
        to: [{ email: email }],
        subject: 'Confirm your NotiProof account',
        htmlContent: `
          <!DOCTYPE html>
          <html>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f9fafb;">
              <div style="background-color: white; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h1 style="color: #111827; margin: 0 0 24px 0; font-size: 28px; font-weight: 700;">Welcome to NotiProof!</h1>
                <p style="color: #374151; margin: 0 0 24px 0; font-size: 16px; line-height: 24px;">
                  Thank you for signing up. Click the button below to confirm your email address and activate your account:
                </p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${confirmationLink}" 
                     style="background-color: #2563eb; color: white; padding: 14px 32px; 
                            text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
                    Confirm Email Address
                  </a>
                </div>
                <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 24px 0 0 0;">
                  If the button doesn't work, copy and paste this link into your browser:<br>
                  <a href="${confirmationLink}" style="color: #2563eb; word-break: break-all;">${confirmationLink}</a>
                </p>
                <p style="color: #9ca3af; font-size: 13px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                  If you didn't create a NotiProof account, you can safely ignore this email.
                </p>
              </div>
            </body>
          </html>
        `,
      }),
    });

    if (!brevoResponse.ok) {
      const brevoError = await brevoResponse.text();
      console.error('Brevo API error:', brevoError);
      
      await supabase.from('email_send_log').insert({
        recipient_email: email,
        email_type: 'confirmation',
        status: 'failed',
        error_message: `Brevo API error: ${brevoError}`
      });
      
      throw new Error(`Brevo API error: ${brevoError}`);
    }

    // Log successful send
    await supabase.from('email_send_log').insert({
      recipient_email: email,
      email_type: 'confirmation',
      status: 'sent',
      sent_at: new Date().toISOString()
    });

    console.log(`Confirmation email sent successfully via Brevo to: ${email}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Confirmation email sent' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error sending confirmation email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
