/**
 * Next.js Middleware entry point.
 *
 * Re-exports the `proxy` function (which runs the Supabase session updater)
 * and the route `config` from `src/proxy.ts`.
 *
 * This file MUST live at `src/middleware.ts` for Next.js to pick it up.
 * Do NOT rename or move it — the framework looks for this exact path.
 */
export { proxy as middleware, config } from "@/proxy";
