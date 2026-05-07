import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { serverEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

function getStripe() {
  return new Stripe(serverEnv.STRIPE_SECRET_KEY, { apiVersion: "2026-04-22.dahlia" });
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore setAll error in API routes
            }
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Rate limit: 5 checkout attempts per user per minute
    const { data: allowed } = await supabase.rpc("claim_api_rate_limit", {
      p_scope: "stripe-checkout",
      p_identifier: user.id,
      p_window_seconds: 60,
      p_max_requests: 5,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Intenta en un momento." },
        { status: 429 },
      );
    }

    const { priceId } = await req.json();

    if (!priceId) {
      return NextResponse.json({ error: "Missing priceId" }, { status: 400 });
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
