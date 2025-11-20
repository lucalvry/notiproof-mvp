import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

interface TestNotificationRequest {
  email: string;
  campaignName: string;
  message: string;
  subtext?: string;
  settings?: {
    showImage?: boolean;
    ctaEnabled?: boolean;
    ctaLabel?: string;
    borderRadius?: number;
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, campaignName, message, subtext, settings }: TestNotificationRequest = await req.json();

    if (!email || !campaignName || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!BREVO_API_KEY) {
      console.error("BREVO_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create HTML email with notification preview
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Test Notification - ${campaignName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <!-- Header -->
          <div style="background: white; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="margin: 0 0 10px 0; font-size: 24px; color: #333;">Test Notification Preview</h1>
            <p style="margin: 0; color: #666; font-size: 14px;">Campaign: <strong>${campaignName}</strong></p>
          </div>
          
          <!-- Notification Preview -->
          <div style="background: white; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0 0 15px 0; color: #666; font-size: 14px;">This is how your notification will appear on your website:</p>
            
            <div style="background: #f9fafb; border: 2px solid #e5e7eb; padding: 20px; border-radius: ${settings?.borderRadius || 12}px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <div style="display: flex; gap: 12px; align-items: flex-start;">
                ${settings?.showImage !== false ? `
                  <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; flex-shrink: 0;">
                    SJ
                  </div>
                ` : ''}
                <div style="flex: 1;">
                  <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #111;">
                    ${message}
                  </p>
                  ${subtext ? `
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">
                      ${subtext}
                    </p>
                  ` : ''}
                  ${settings?.ctaEnabled ? `
                    <button style="margin-top: 8px; padding: 6px 14px; background: #667eea; color: white; border: none; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer;">
                      ${settings.ctaLabel || 'Learn More'}
                    </button>
                  ` : ''}
                  <p style="margin: 8px 0 0 0; font-size: 11px; color: #999;">
                    ✓ Just now
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Instructions -->
          <div style="background: white; padding: 30px; border-radius: 8px;">
            <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #333;">Next Steps</h2>
            <ol style="margin: 0; padding-left: 20px; color: #666; font-size: 14px; line-height: 1.6;">
              <li style="margin-bottom: 8px;">Review the notification preview above</li>
              <li style="margin-bottom: 8px;">If satisfied, activate your campaign in the dashboard</li>
              <li style="margin-bottom: 8px;">Install the widget code on your website</li>
              <li>Connect your data sources for real-time notifications</li>
            </ol>
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p style="margin: 0;">This is a test notification from NotiProof</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email via Brevo
    const brevoResponse = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "NotiProof",
          email: "noreply@notiproof.com",
        },
        to: [
          {
            email: email,
            name: email.split("@")[0],
          },
        ],
        subject: `Test Notification: ${campaignName}`,
        htmlContent: emailHtml,
      }),
    });

    if (!brevoResponse.ok) {
      const errorData = await brevoResponse.text();
      console.error("Brevo API error:", errorData);
      throw new Error(`Failed to send email: ${brevoResponse.statusText}`);
    }

    const responseData = await brevoResponse.json();
    console.log("Test notification sent successfully:", responseData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Test notification sent successfully",
        messageId: responseData.messageId 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Error in send-test-notification function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Internal server error",
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
