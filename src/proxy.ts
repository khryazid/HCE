import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * HAL-11 / S-01: Inyecta un X-Request-ID único en cada request.
 * Permite correlacionar acciones del usuario con logs del servidor en Vercel Logs.
 *
 * En el Edge runtime los headers del request son INMUTABLES — no se puede usar
 * request.headers.set(). La única forma de propagarlos al handler es clonar los
 * headers y pasarlos via NextResponse.next({ request: { headers } }).
 *
 * Los API Routes leen este header con: req.headers.get("x-request-id")
 * y lo pasan a serverLog.withRequestId() para trazabilidad end-to-end.
 */
function injectRequestIdAndCSP(request: NextRequest, response: NextResponse): NextResponse {
  const existingId = request.headers.get("x-request-id");
  const requestId = existingId ?? crypto.randomUUID();

  // CSP Nonce generation
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://js.stripe.com https://va.vercel-scripts.com ${
      process.env.NODE_ENV === "development" ? "'unsafe-eval'" : ""
    };
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: blob: https:;
    font-src 'self' data: https://fonts.gstatic.com;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://vitals.vercel-insights.com;
    frame-src 'self' https://js.stripe.com https://hooks.stripe.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `;
  const contentSecurityPolicyHeaderValue = cspHeader
    .replace(/\s{2,}/g, " ")
    .trim();

  // Si la response es un redirect (302, 307, 308), preservarla intacta.
  // Solo agregar el header x-request-id sin destruir el redirect.
  if (response.headers.get("location")) {
    response.headers.set("x-request-id", requestId);
    return response;
  }

  // Para responses normales (NextResponse.next), clonar headers y propagar
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicyHeaderValue);

  const newResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Copiar cookies de la response de Supabase SSR (token refresh, etc.)
  response.cookies.getAll().forEach((cookie) => {
    newResponse.cookies.set(cookie);
  });

  // Exponer headers en la response
  newResponse.headers.set("x-request-id", requestId);
  newResponse.headers.set("Content-Security-Policy", contentSecurityPolicyHeaderValue);

  return newResponse;
}

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);
  return injectRequestIdAndCSP(request, response);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
