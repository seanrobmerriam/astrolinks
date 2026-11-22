import { defineMiddleware } from "astro:middleware";
import { ConfigError, readConfig } from "./lib/config";
import { getServiceHealth } from "./lib/health";

// Loads the dashboard config and the latest service check results once per
// page request; components read them from Astro.locals. Checks never delay the
// page: it shows the cached results, and the browser fetches fresh ones.
export const onRequest = defineMiddleware(async (context, next) => {
  if (context.url.pathname.startsWith("/api/")) return next();
  try {
    context.locals.dashboard = await readConfig();
    context.locals.health = await getServiceHealth(context.locals.dashboard.services);
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
    return new Response(`Astrolinks could not load its config.\n\n${error.message}\n\nFix the problem above and reload this page.\n`, {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  return next();
});
