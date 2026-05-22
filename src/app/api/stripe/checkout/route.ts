import { NextResponse } from "next/server";
import Stripe from "stripe";
import { serverEnv } from "@/lib/env";
import { isValidOrigin } from "@/lib/api/guards";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

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
    const { data: allowed, error: rateLimitError } = await supabase.rpc("claim_api_rate_limit", {
      p_scope: "stripe-checkout",
      p_identifier: user.id,
      p_window_seconds: 60,
      p_max_requests: 5,
    });
    if (rateLimitError || !allowed) {
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
    if (allowedPriceIds.size > 0 && !allowedPriceIds.has(priceId)) {
      return NextResponse.json(
        { error: "Plan no válido. Selecciona un plan disponible." },
        { status: 400 },
      );
    }

    // Get the user's profile to see if they already have a customer ID
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("doctor_id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      // Create a new customer in Stripe
      const customer = await getStripe().customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      // Ensure the service role key is used to update the profile if RLS blocks it
      // Wait, the user can update their own profile since `doctor_id = auth.uid()`
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("doctor_id", user.id);
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
    console.error("Stripe Checkout Error:", error);
    return NextResponse.json(
      { error: process.env.NODE_ENV === "development" ? message : "Error al procesar el pago. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
