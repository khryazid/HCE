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
function injectRequestId(request: NextRequest, response: NextResponse): NextResponse {
  const existingId = request.headers.get("x-request-id");
  const requestId = existingId ?? crypto.randomUUID();

  // Si la response es un redirect (302, 307, 308), preservarla intacta.
  // Solo agregar el header x-request-id sin destruir el redirect.
  if (response.headers.get("location")) {
    response.headers.set("x-request-id", requestId);
    return response;
  }

  // Para responses normales (NextResponse.next), clonar headers y propagar
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  const newResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Copiar cookies de la response de Supabase SSR (token refresh, etc.)
  response.cookies.getAll().forEach((cookie) => {
    newResponse.cookies.set(cookie);
  });

  // Exponer el requestId en el response header (útil para debug desde el cliente)
  newResponse.headers.set("x-request-id", requestId);

  return newResponse;
}

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);
  return injectRequestId(request, response);
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
