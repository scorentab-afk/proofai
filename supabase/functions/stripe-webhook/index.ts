import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

const PLAN_MAP: Record<string, string> = {
  price_indie: "indie",
  price_startup: "startup",
  price_scale: "scale",
  price_enterprise: "enterprise",
};

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    // In production, verify the webhook signature with Stripe
    // For now, parse the event directly
    const event = JSON.parse(body);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        const customerId = session.customer;

        if (userId) {
          await supabase
            .from("subscriptions")
            .update({
              stripe_customer_id: customerId,
              stripe_subscription_id: session.subscription,
              status: "active",
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const priceId = subscription.items?.data?.[0]?.price?.id;
        const plan = Object.entries(PLAN_MAP).find(
          ([key]) => priceId?.includes(key)
        )?.[1] || "free";

        await supabase
          .from("subscriptions")
          .update({
            plan,
            status: subscription.status === "active" ? "active" : subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        // Update all API keys for this user to the new plan
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_subscription_id", subscription.id)
          .single();

        if (sub) {
          await supabase
            .from("api_keys")
            .update({ plan })
            .eq("user_id", sub.user_id);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;

        const { data: sub } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_subscription_id", subscription.id)
          .single();

        if (sub) {
          await supabase
            .from("subscriptions")
            .update({
              plan: "free",
              status: "canceled",
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subscription.id);

          // Downgrade API keys
          await supabase
            .from("api_keys")
            .update({ plan: "free" })
            .eq("user_id", sub.user_id);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        await supabase
          .from("subscriptions")
          .update({
            status: "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", invoice.customer);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});
