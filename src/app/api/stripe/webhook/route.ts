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

  // C-02: Idempotency check — Stripe guarantees at-least-once delivery, not exactly-once.
  // If this event was already processed (e.g. Vercel timeout retry), skip it silently.
  const { error: idempotencyError } = await supabaseAdmin
    .from("stripe_webhook_events")
    .insert({ stripe_event_id: event.id });

  if (idempotencyError) {
    if (idempotencyError.code === "23505") {
      // unique_violation — event already processed, return 200 to stop Stripe retrying.
      console.info(`[stripe:webhook] Duplicate event skipped: ${event.id}`);
      return NextResponse.json({ received: true, duplicate: true });
    }
    // Unexpected DB error — let Stripe retry.
    console.error("[stripe:webhook] Idempotency insert failed:", idempotencyError);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const status = subscription.status;
        // In Stripe v22, current_period_end is on each SubscriptionItem
        const periodEnd = subscription.items.data[0]?.current_period_end ?? 0;
        const expiresAt = new Date(periodEnd * 1000).toISOString();
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
        const invoice = event.data.object as Stripe.Invoice;
        // In Stripe v22, subscription moved to invoice.parent.subscription_details.subscription
        const rawSub = invoice.parent?.subscription_details?.subscription;
        const invoiceSubId = typeof rawSub === "string" ? rawSub
          : (rawSub as Stripe.Subscription | null | undefined)?.id ?? null;
        if (invoiceSubId && invoice.customer) {
          const subscription = await getStripe().subscriptions.retrieve(invoiceSubId);
          // Stripe.Response<Subscription> extends Subscription — access item's period end
          const periodEnd = subscription.items.data[0]?.current_period_end ?? 0;
          const expiresAt = new Date(periodEnd * 1000).toISOString();

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
        // A-11: Grace period of 7 days — do NOT cut access on first failure.
        // Stripe retries up to 4 times over ~14 days. Access is suspended only when
        // subscription_status becomes "unpaid" or "canceled" via
        // the customer.subscription.updated/deleted events above.
        const invoice = event.data.object as Stripe.Invoice;
        // In Stripe v22, subscription moved to invoice.parent.subscription_details.subscription
        const rawFailedSub = invoice.parent?.subscription_details?.subscription;
        const failedSubId = typeof rawFailedSub === "string" ? rawFailedSub
          : (rawFailedSub as Stripe.Subscription | null | undefined)?.id ?? null;
        if (failedSubId && invoice.customer) {
          const gracePeriodExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

          await supabaseAdmin
            .from("profiles")
            .update({
              subscription_status: "past_due",
              // subscription_expires_at stays intact — access is NOT cut during grace period.
            })
            .eq("stripe_customer_id", invoice.customer as string)
            .eq("subscription_status", "active"); // Only downgrade active subs, not trialing

          console.info(
            `[stripe:webhook] Payment failed — grace period until ${gracePeriodExpiresAt}. ` +
            `Customer: ${invoice.customer as string}`
          );
        }
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription") {
          const customerId = session.customer as string;
          const subscriptionId = session.subscription as string;

          const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
          // In Stripe v22, current_period_end is per SubscriptionItem
          const periodEnd = subscription.items.data[0]?.current_period_end ?? 0;
          const expiresAt = new Date(periodEnd * 1000).toISOString();
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
