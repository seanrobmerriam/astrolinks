import { defineMiddleware } from "astro:middleware";
import { ConfigError, readConfig } from "./lib/config";

// Loads the dashboard config once per page request; components read it from Astro.locals.
export const onRequest = defineMiddleware(async (context, next) => {
  if (context.url.pathname.startsWith("/api/")) return next();
  try {
    context.locals.dashboard = await readConfig();
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
    return new Response(`Astrolinks could not load its config.\n\n${error.message}\n\nFix the problem above and reload this page.\n`, {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  return next();
});
