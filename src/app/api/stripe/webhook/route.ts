import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";
import { serverLog, getRequestId } from "@/lib/observability/server-logger";

export const dynamic = "force-dynamic";

function getStripe() {
  return new Stripe(serverEnv.STRIPE_SECRET_KEY, { apiVersion: "2026-04-22.dahlia" });
}

const getWebhookSecret = () => serverEnv.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  const log = serverLog.withRequestId(getRequestId(req));
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    log.warn("stripe:webhook", "Request sin stripe-signature rechazada");
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, getWebhookSecret());
  } catch (err) {
    log.error("stripe:webhook", "Fallo en verificación de firma", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // R-07: Usar createClient con URL/key centralizados — evita non-null assertions.
  // Se usa el cliente no tipado (@supabase/supabase-js) porque stripe_webhook_events
  // no está en los tipos generados aún. Actualizar con `npm run db:types`.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    log.critical("stripe:webhook", "NEXT_PUBLIC_SUPABASE_URL no configurado");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const supabaseAdmin = createClient(supabaseUrl, serverEnv.SUPABASE_SERVICE_ROLE_KEY);

  // C-02: Idempotency check — Stripe guarantees at-least-once delivery, not exactly-once.
  // Insertamos el ID del evento inmediatamente. Si falla por unique constraint (23505),
  // significa que ya está en procesamiento o procesado, previniendo race conditions y replay attacks.
  const { error: insertIdempotencyError } = await supabaseAdmin
    .from("stripe_webhook_events")
    .insert({ stripe_event_id: event.id });

  if (insertIdempotencyError) {
    if (insertIdempotencyError.code === "23505") {
      log.info("stripe:webhook", "Evento duplicado ignorado (ya procesado)", { eventId: event.id, type: event.type });
      return NextResponse.json({ received: true, duplicate: true });
    }
    log.error("stripe:webhook", "Fallo al guardar registro de idempotencia", { error: insertIdempotencyError.message });
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

        // Fix B-09: leer el plan PREVIO para actuar solo si hubo downgrade REAL clinic → basic.
        let previousPlan: string | null = null;
        let clinicId: string | null = null;
        if (event.type === "customer.subscription.updated" && plan === "basic") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const prevAttr = event.data.previous_attributes as any;
          if (prevAttr?.items?.data?.[0]?.price?.metadata?.plan) {
            previousPlan = prevAttr.items.data[0].price.metadata.plan;
          } else if (prevAttr?.metadata?.plan) {
            previousPlan = prevAttr.metadata.plan;
          }

          if (previousPlan === "clinic") {
            const { data: preProfile } = await supabaseAdmin
              .from("profiles")
              .select("clinic_id")
              .eq("stripe_customer_id", customerId)
              .maybeSingle();
            clinicId = preProfile?.clinic_id ?? null;
          }
        }

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
          log.critical("stripe:webhook", "Fallo al actualizar suscripción en profiles", {
            eventId: event.id,
            customerId,
            status,
            error: subUpdateError.message,
          });
          return NextResponse.json({ error: "Database update failed" }, { status: 500 });
        }
        log.info("stripe:webhook", `Suscripción ${event.type}`, { customerId, status, plan });

        // Fix B-09 (continuación): actuar solo si hubo downgrade REAL clinic → basic.
        // previousPlan fue leído antes del UPDATE — es el valor real anterior.
        if (event.type === "customer.subscription.updated" && plan === "basic") {
          if (previousPlan === "clinic" && clinicId) {
            const { data: extraDoctors } = await supabaseAdmin
              .from("clinic_members")
              .select("id")
              .eq("clinic_id", clinicId)
              .eq("role", "doctor");

            if (extraDoctors && extraDoctors.length > 0) {
              const ids = extraDoctors.map((m: { id: string }) => m.id);
              await supabaseAdmin.from("clinic_members").delete().in("id", ids);
              log.warn("stripe:webhook", "Downgrade clinic→basic confirmado: doctores retirados", {
                clinicId,
                removedCount: ids.length,
              });
            }
          } else {
            log.info("stripe:webhook", "subscription.updated plan=basic pero sin downgrade real (previo: " + previousPlan + ")", { customerId });
          }
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
          await supabaseAdmin
            .from("profiles")
            .update({
              subscription_status: "past_due",
              // subscription_expires_at stays intact — access is NOT cut during grace period.
            })
            .eq("stripe_customer_id", invoice.customer as string)
            .eq("subscription_status", "active"); // Only downgrade active subs, not trialing

          log.warn("stripe:webhook", "Pago fallido — inicio de periodo de gracia (7 días)", {
            customerId: invoice.customer as string,
            failedSubId,
          });
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
            log.critical("stripe:webhook", "Fallo al actualizar perfil tras checkout.session.completed", {
              eventId: event.id,
              customerId,
              error: sessionUpdateError.message,
            });
            return NextResponse.json({ error: "Database update failed" }, { status: 500 });
          }
          log.info("stripe:webhook", "checkout.session.completed procesado", { customerId, plan });
        }
        break;
      }
      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object as Stripe.Subscription;
        log.info("stripe:webhook", "Trial finalizando pronto (Resend email pendiente)", {
          customerId: subscription.customer as string,
        });
        break;
      }
      default: {
        // Evento de Stripe no manejado — loguear para visibilidad sin retornar error.
        // Stripe recomienda retornar 200 para eventos desconocidos y procesarlos selectivamente.
        log.info("stripe:webhook", `Evento no manejado recibido: ${event.type}`, { eventId: event.id });
        break;
      }
    }



    return NextResponse.json({ received: true });
  } catch (error) {
    log.critical("stripe:webhook", "Error inesperado en el handler", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
