import { NextResponse } from "next/server";
import Stripe from "stripe";
import { serverEnv } from "@/lib/env";
import { isValidOrigin } from "@/lib/api/guards";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function getStripe() {
  // Fix B-13: usar serverEnv (validado en startup) igual que checkout/route.ts
  return new Stripe(serverEnv.STRIPE_SECRET_KEY, { apiVersion: "2026-04-22.dahlia" });
}

export async function POST(req: Request) {
  try {
    // Fix B-13: Validar Origin para prevenir CSRF, igual que en /api/stripe/checkout
    if (!isValidOrigin(req)) {
      return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
    }

    // S-02: Usar createClient() centralizado con validación de env vars
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("doctor_id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No se encontró el ID de cliente de Stripe." },
        { status: 404 }
      );
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/ajustes`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error interno del servidor.";
    console.error("Stripe Portal Error:", error);
    return NextResponse.json(
      { error: process.env.NODE_ENV === "development" ? message : "Error al abrir el portal de Stripe." },
      { status: 500 }
    );
  }
}
