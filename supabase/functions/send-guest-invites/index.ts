import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendGuestInviteRequest {
  planId: string;
  planTitle: string;
  guests: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  }[];
  customMessage?: string;
  hostName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { planId, planTitle, guests, customMessage, hostName }: SendGuestInviteRequest = await req.json();

    console.log(`Sending invites for plan ${planId} to ${guests.length} guests`);

    const emailResults = [];
    const smsResults = [];

    // Send email invites
    for (const guest of guests) {
      if (guest.email) {
        try {
          const emailResponse = await resend.emails.send({
            from: "Floq <invites@resend.dev>",
            to: [guest.email],
            subject: `You're invited to "${planTitle}"!`,
            html: `
              <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <h1 style="color: #1a1a1a; margin-bottom: 24px;">You're Invited! 🎉</h1>
                
                <div style="background: #f8f9fa; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
                  <h2 style="color: #495057; margin: 0 0 12px 0;">${planTitle}</h2>
                  ${hostName ? `<p style="color: #6c757d; margin: 0;"><strong>${hostName}</strong> has invited you to join this plan.</p>` : ''}
                </div>

                ${customMessage ? `
                  <div style="background: #e3f2fd; padding: 16px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #2196f3;">
                    <p style="margin: 0; color: #1565c0; font-style: italic;">"${customMessage}"</p>
                  </div>
                ` : ''}

                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
                  <h3 style="color: white; margin: 0 0 16px 0;">Ready to join?</h3>
                  <a href="${Deno.env.get("SITE_URL") || 'https://floq.app'}/plan/${planId}" 
                     style="display: inline-block; background: white; color: #667eea; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
                    View Plan Details
                  </a>
                </div>

                <div style="color: #6c757d; font-size: 14px; text-align: center;">
                  <p>Can't make it? No worries - just let us know when you view the plan.</p>
                  <p style="margin-top: 16px;">
                    <a href="#" style="color: #6c757d;">Unsubscribe from plan invites</a>
                  </p>
                </div>
              </div>
            `,
          });

          emailResults.push({ guest: guest.name, email: guest.email, success: true, id: emailResponse.id });
        } catch (error) {
          console.error(`Failed to send email to ${guest.email}:`, error);
          emailResults.push({ guest: guest.name, email: guest.email, success: false, error: error.message });
        }
      }

      // For SMS, you'd integrate with a service like Twilio here
      if (guest.phone) {
        // Placeholder for SMS functionality
        console.log(`Would send SMS to ${guest.phone} for guest ${guest.name}`);
        smsResults.push({ guest: guest.name, phone: guest.phone, success: true, note: "SMS functionality not yet implemented" });
      }
    }

    const response = {
      success: true,
      emailsSent: emailResults.filter(r => r.success).length,
      smsSent: smsResults.filter(r => r.success).length,
      totalGuests: guests.length,
      results: {
        emails: emailResults,
        sms: smsResults
      }
    };

    console.log("Invite sending completed:", response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-guest-invites function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        emailsSent: 0,
        smsSent: 0
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);