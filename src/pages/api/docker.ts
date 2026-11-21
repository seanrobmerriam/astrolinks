import type { APIRoute } from "astro";
import { getDockerStats } from "../../lib/docker";

export const GET: APIRoute = async () => {
  const result = await getDockerStats();
  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : 503,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};
