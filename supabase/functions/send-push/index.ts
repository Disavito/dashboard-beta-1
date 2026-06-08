import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { user_id, title, message, link } = body;

    if (!user_id || !title || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase Client to fetch subscriptions
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase env vars");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the subscriptions for this user
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (error) throw error;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No push subscriptions found for user" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Set VAPID Details
    // In production, these should be securely stored in Deno.env
    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY") || "BFvK5iFMrQNV-v6BrrrpXAJtZl0UnBf7qz-H2DAGTUmMGA6ctkf8-1BO2xRh8EBOCR1Y9yj0dlHvzILFTH754Ys";
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY") || "rH8xnPgBzVfm7vc2fusjUBtGlz-n2Z7KME-nCcpDp8E";

    webpush.setVapidDetails(
      "mailto:admin@example.com",
      vapidPublic,
      vapidPrivate
    );

    const notificationPayload = JSON.stringify({
      title,
      body: message,
      url: link || "/",
      icon: "/vite.svg"
    });

    const sendPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };
      
      try {
        await webpush.sendNotification(pushSubscription, notificationPayload);
      } catch (err: any) {
        // If the subscription is expired or invalid (410, 404), delete it from DB
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("Error sending push to", sub.endpoint, err);
        }
      }
    });

    await Promise.all(sendPromises);

    return new Response(JSON.stringify({ success: true, count: subscriptions.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
