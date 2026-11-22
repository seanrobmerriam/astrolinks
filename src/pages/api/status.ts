import type { APIRoute } from "astro";
import { ConfigError, readConfig } from "../../lib/config";
import { CHECK_INTERVAL_MS, getServiceHealth } from "../../lib/health";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

/** Latest check results keyed by service id. Waits only for services that have never been checked. */
export const GET: APIRoute = async () => {
  try {
    const { services } = await readConfig();
    const results = await getServiceHealth(services, { waitForNew: true });
    return json({ results, intervalMs: CHECK_INTERVAL_MS });
  } catch (error) {
    if (error instanceof ConfigError) return json({ error: error.message }, 500);
    throw error;
  }
};
