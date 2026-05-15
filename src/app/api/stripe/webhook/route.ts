import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

function getStripe() {
  return new Stripe(serverEnv.STRIPE_SECRET_KEY, { apiVersion: "2026-04-22.dahlia" });
}

const getWebhookSecret = () => serverEnv.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, getWebhookSecret());
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Use service role to bypass RLS and update subscription status
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription = event.data.object as any;
        const customerId = subscription.customer as string;
        const status = subscription.status;
        const expiresAt = new Date(subscription.current_period_end * 1000).toISOString();
        const plan = subscription.items.data[0]?.price.metadata?.plan || "basic";

        const { error: subUpdateError } = await supabaseAdmin
          .from("profiles")
          .update({
            subscription_status: status,
            stripe_subscription_id: subscription.id,
            subscription_expires_at: expiresAt,
            plan: plan as "basic" | "clinic",
          })
          .eq("stripe_customer_id", customerId);

        if (subUpdateError) {
          console.error("[stripe:webhook] Failed to update profile subscription:", subUpdateError);
          return NextResponse.json({ error: "Database update failed" }, { status: 500 });
        }
        break;
      }
      case "invoice.payment_succeeded": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any;
        if (invoice.subscription && invoice.customer) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const subscription = await getStripe().subscriptions.retrieve(invoice.subscription as string) as any;
          const expiresAt = new Date(subscription.current_period_end * 1000).toISOString();
          
          await supabaseAdmin
            .from("profiles")
            .update({
              subscription_status: subscription.status,
              subscription_expires_at: expiresAt,
            })
            .eq("stripe_customer_id", invoice.customer as string);
        }
        break;
      }
      case "invoice.payment_failed": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any;
        if (invoice.subscription && invoice.customer) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const subscription = await getStripe().subscriptions.retrieve(invoice.subscription as string) as any;
          
          await supabaseAdmin
            .from("profiles")
            .update({
              subscription_status: subscription.status, // usually past_due
            })
            .eq("stripe_customer_id", invoice.customer as string);
        }
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription") {
          const customerId = session.customer as string;
          const subscriptionId = session.subscription as string;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const subscription = await getStripe().subscriptions.retrieve(subscriptionId) as any;
          const expiresAt = new Date(subscription.current_period_end * 1000).toISOString();
          const plan = subscription.items.data[0]?.price.metadata?.plan || "basic";

          const { error: sessionUpdateError } = await supabaseAdmin
            .from("profiles")
            .update({
              subscription_status: subscription.status,
              stripe_subscription_id: subscription.id,
              subscription_expires_at: expiresAt,
              plan: plan as "basic" | "clinic",
            })
            .eq("stripe_customer_id", customerId);

          if (sessionUpdateError) {
            console.error("[stripe:webhook] Failed to update profile after checkout:", sessionUpdateError);
            return NextResponse.json({ error: "Database update failed" }, { status: 500 });
          }
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
