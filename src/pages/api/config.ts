import type { APIRoute } from "astro";
import { ConfigError, readConfig, writeConfig } from "../../lib/config";

const MAX_BODY_BYTES = 1_000_000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function failure(error: unknown, status: number) {
  if (error instanceof ConfigError) return json({ error: error.message }, status);
  console.error(error);
  return json({ error: "Could not access the config file. See the server log for details." }, 500);
}

export const GET: APIRoute = async () => {
  try {
    return json(await readConfig());
  } catch (error) {
    return failure(error, 500);
  }
};

/** Replaces the whole dashboard. JSON only: a cross-site page can't send that without CORS, which we don't allow. */
export const PUT: APIRoute = async ({ request }) => {
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return json({ error: "Expected a JSON body" }, 415);
  }
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) return json({ error: "Config is too large" }, 413);

  let input: unknown;
  try {
    input = JSON.parse(body);
  } catch {
    return json({ error: "Body is not valid JSON" }, 400);
  }

  try {
    return json(await writeConfig(input));
  } catch (error) {
    // Invalid input, or the file on disk is broken and must be fixed by hand first.
    return failure(error, 422);
  }
};
