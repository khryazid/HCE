import { NextResponse } from "next/server";
import Stripe from "stripe";
import { serverEnv } from "@/lib/env";
import { isValidOrigin } from "@/lib/api/guards";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";
import { serverLog } from "@/lib/observability/server-logger";

export const dynamic = "force-dynamic";

// A-13: Schema Zod para el body del checkout.
// Fix B-12: priceId se valida contra una whitelist de price IDs permitidos
// para evitar que un usuario autenticado suscriba a cualquier precio de Stripe.
function getAllowedPriceIds(): Set<string> {
  return new Set(
    [
      process.env.NEXT_PUBLIC_STRIPE_PRICE_ID,
      process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_CLINIC,
    ].filter((id): id is string => typeof id === "string" && id.length > 0)
  );
}

const checkoutBodySchema = z.object({
  priceId: z.string().min(1, "priceId requerido"),
});

function getStripe() {
  return new Stripe(serverEnv.STRIPE_SECRET_KEY, { apiVersion: "2026-04-22.dahlia" });
}

export async function POST(req: Request) {
  const reqId = req.headers.get("x-request-id") ?? "";
  const log = serverLog.withRequestId(reqId);

  try {
    // M-16: Validar Origin para prevenir CSRF en operaciones de pago
    if (!isValidOrigin(req)) {
      return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
    }

    // S-02: Usar createClient() centralizado con validación de env vars
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Rate limit: 5 checkout attempts per user per minute
    // claim_api_rate_limit returns TRUE when the limit is EXCEEDED
    const { data: rateLimited, error: rateLimitError } = await supabase.rpc("claim_api_rate_limit", {
      p_scope: "stripe-checkout",
      p_identifier: user.id,
      p_window_seconds: 60,
      p_max_requests: 5,
    });
    if (rateLimitError || rateLimited) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Intenta en un momento." },
        { status: 429 },
      );
    }

    // A-13: Validar body con Zod
    const rawBody = await req.json();
    const parsed = checkoutBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido" },
        { status: 400 },
      );
    }
    const { priceId } = parsed.data;

    // Fix B-12: Validar que el priceId sea uno de los precios permitidos por la app.
    // Evita que un usuario autenticado suscriba a cualquier precio de la cuenta Stripe.
    const allowedPriceIds = getAllowedPriceIds();
    if (allowedPriceIds.size === 0) {
      // Las env vars de precio no están configuradas — error de despliegue, no del usuario.
      log.error("stripe:checkout", "NEXT_PUBLIC_STRIPE_PRICE_ID y CLINIC no configurados — whitelist vacía", {});
      return NextResponse.json(
        { error: "El sistema de pagos no está configurado correctamente. Contacta al administrador." },
        { status: 500 },
      );
    }
    if (!allowedPriceIds.has(priceId)) {
      return NextResponse.json(
        { error: "Plan no válido. Selecciona un plan disponible." },
        { status: 400 },
      );
    }

    // Get the user's profile to see if they already have a customer ID.
    // Also validates the profile exists — if not, the user hasn't completed onboarding.
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, clinic_id")
      .eq("doctor_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "Perfil no encontrado. Completa el proceso de registro antes de suscribirte." },
        { status: 404 },
      );
    }

    if (profile.clinic_id) {
      const { data: ownerRow } = await supabase
        .from("profiles")
        .select("doctor_id")
        .eq("clinic_id", profile.clinic_id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
        
      const { data: memberRow } = await supabase
        .from("clinic_members")
        .select("role")
        .eq("clinic_id", profile.clinic_id)
        .eq("doctor_id", user.id)
        .maybeSingle();
        
      const isAdmin = (ownerRow?.doctor_id === user.id) || (memberRow?.role === "admin");
      if (!isAdmin) {
        return NextResponse.json(
          { error: "Solo los administradores de la clínica pueden modificar la suscripción." },
          { status: 403 }
        );
      }
    }

    let customerId = profile.stripe_customer_id;

    if (!customerId) {
      // Create a new customer in Stripe
      const customer = await getStripe().customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      // HAL-13.1: stripe_customer_id es un campo de billing — la policy profiles_tenant_update
      // bloquea su escritura desde el cliente autenticado. Usar service_role (createAdminClient)
      // que bypasea RLS, igual que el webhook handler para todos los writes de billing.
      const supabaseAdmin = createAdminClient();
      const { error: customerIdError } = await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("doctor_id", user.id);

      if (customerIdError) {
        // No bloquear el checkout si falla — webhook lo corregir\u00e1 en checkout.session.completed.
        log.error("stripe:checkout", "No se pudo guardar stripe_customer_id", { error: customerIdError.message });
      }
    }

    // Create Checkout Session
    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
        },
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error interno del servidor.";
    log.error("stripe:checkout", "Stripe Checkout Error", { error });
    return NextResponse.json(
      { error: process.env.NODE_ENV === "development" ? message : "Error al procesar el pago. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
