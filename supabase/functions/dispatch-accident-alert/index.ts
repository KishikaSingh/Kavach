// ==============================================================================
// Supabase Edge Function: dispatch-accident-alert
// Path: supabase/functions/dispatch-accident-alert/index.ts
// Description: Triggered when an accident alert is detected. Sends Expo push
//              notifications to the rider's device, logs emergency SMS dispatch,
//              and records in-app notifications.
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.118.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    // Payload can come from Supabase Database Webhook ({ type: 'INSERT', record: ... }) or direct call
    const alert = payload.record || payload.alert || payload;
    const alertId = alert.id;
    const helmetId = alert.helmet_id || alert.deviceId || "HELMET_001";

    if (!alertId) {
      return new Response(JSON.stringify({ error: "Missing alertId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing accident alert ${alertId} for helmet ${helmetId}`);

    // 1. Fetch helmet and owner details
    const { data: helmet } = await supabase
      .from("helmets")
      .select("owner_id, name")
      .eq("id", helmetId)
      .maybeSingle();

    const ownerId = helmet?.owner_id;

    // 2. Format emergency coordinates
    const hasGps = alert.gps_valid && alert.latitude && alert.longitude;
    const mapsLink = hasGps
      ? `https://maps.google.com/?q=${alert.latitude},${alert.longitude}`
      : "GPS fix unavailable";

    const emergencyMessage = `EMERGENCY ALERT: Kavach Smart Helmet detected an accident for rider. Location: ${mapsLink}`;

    // 3. Dispatch SMS to emergency contacts (Simulation by default for college demo)
    let finalSmsStatus = "simulated";
    if (ownerId) {
      const { data: contacts } = await supabase
        .from("emergency_contacts")
        .select("*")
        .eq("user_id", ownerId);

      if (contacts && contacts.length > 0) {
        for (const contact of contacts) {
          console.log(`[SIMULATED SMS] Dispatching to ${contact.name} (${contact.phone}): ${emergencyMessage}`);
          // Record in sms_delivery_logs
          await supabase.from("sms_delivery_logs").insert({
            alert_id: alertId,
            contact_id: contact.id,
            recipient_phone: contact.phone,
            status: "simulated",
            provider: "simulation",
            message_body: emergencyMessage,
          });
        }
      }

      // 4. Send Expo Push Notifications if push tokens exist
      const { data: pushTokens } = await supabase
        .from("push_tokens")
        .select("token")
        .eq("user_id", ownerId);

      if (pushTokens && pushTokens.length > 0) {
        const messages = pushTokens.map((t) => ({
          to: t.token,
          sound: "default",
          title: "Accident Alert Detected!",
          body: `High severity impact recorded. Location: ${hasGps ? `${alert.latitude}, ${alert.longitude}` : "Unavailable"}`,
          data: { alertId, helmetId },
        }));

        try {
          await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Accept-Encoding": "gzip, deflate",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(messages),
          });
        } catch (pushErr) {
          console.error("Expo push notification delivery error:", pushErr);
        }
      }

      // 5. Insert In-App Notification
      await supabase.from("in_app_notifications").insert({
        user_id: ownerId,
        type: "accident",
        title: "Accident detected",
        body: `Impact detected at ${hasGps ? `${alert.latitude}, ${alert.longitude}` : "unknown coordinates"}.`,
        read: false,
        alert_id: alertId,
        device_id: helmetId,
      });
    }

    // 6. Update alert with SMS delivery status
    await supabase
      .from("accident_alerts")
      .update({ sms_status: finalSmsStatus })
      .eq("id", alertId);

    return new Response(
      JSON.stringify({
        success: true,
        alertId,
        helmetId,
        smsStatus: finalSmsStatus,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
