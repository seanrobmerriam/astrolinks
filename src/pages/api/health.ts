import type { APIRoute } from "astro";

/** Liveness check for the container HEALTHCHECK; doesn't touch the config or Docker. */
export const GET: APIRoute = () => new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
