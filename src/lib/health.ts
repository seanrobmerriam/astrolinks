// Server-only: checks whether each service answers at its URL.
//
// A check is one GET request that is abandoned as soon as the response headers
// arrive. Any HTTP answer means the service is up, including 401/403 (behind a
// login) and 3xx (redirects aren't followed). Gateway errors from a reverse
// proxy (502/503/504) mean the app behind it is down. Certificate problems are
// ignored, because many homelab services use self-signed certificates; this is
// a reachability check, not a security check.
//
// Results are cached per URL and refreshed in the background, so pages and
// API calls never wait for checks except the very first time a URL is seen.
import http from "node:http";
import https from "node:https";
import type { Service, ServiceStatus } from "./schema";

const TIMEOUT_MS = 5_000;
/** Answers slower than this count as degraded. */
const SLOW_MS = 2_000;
/** How often results are refreshed while someone is looking at the dashboard. */
export const CHECK_INTERVAL_MS = 30_000;
const MAX_PARALLEL_CHECKS = 8;

export interface HealthResult {
  status: ServiceStatus;
  /** Time to the first byte of the response; null when there was no response. */
  latencyMs: number | null;
  /** Short explanation shown with the status, e.g. "HTTP 200 in 84 ms". */
  detail: string;
  checkedAt: number;
}

const ERROR_TEXT: Record<string, string> = {
  ECONNREFUSED: "connection refused",
  ECONNRESET: "connection reset",
  ENOTFOUND: "host not found",
  EAI_AGAIN: "host name lookup failed",
  EHOSTUNREACH: "host unreachable",
  ENETUNREACH: "network unreachable",
  ETIMEDOUT: `no answer within ${TIMEOUT_MS / 1000}s`,
};

function check(url: string): Promise<HealthResult> {
  return new Promise((resolve) => {
    const started = performance.now();
    let settled = false;
    const finish = (result: Omit<HealthResult, "checkedAt">) => {
      if (settled) return;
      settled = true;
      resolve({ ...result, checkedAt: Date.now() });
    };

    let target: URL;
    try {
      target = new URL(url);
    } catch {
      return finish({ status: "offline", latencyMs: null, detail: "invalid URL" });
    }
    const client = target.protocol === "https:" ? https : http;
    const request = client.request(
      target,
      {
        method: "GET",
        headers: { "user-agent": "Astrolinks status check", accept: "*/*" },
        rejectUnauthorized: false,
      },
      (response) => {
        const latencyMs = Math.round(performance.now() - started);
        const code = response.statusCode ?? 0;
        response.destroy(); // Headers are all we need; don't download the page.
        if (code === 502 || code === 503 || code === 504) {
          return finish({ status: "offline", latencyMs, detail: `HTTP ${code} from the server in front of it` });
        }
        if (code >= 500) {
          return finish({ status: "degraded", latencyMs, detail: `HTTP ${code} in ${latencyMs} ms` });
        }
        if (latencyMs > SLOW_MS) {
          return finish({ status: "degraded", latencyMs, detail: `slow: HTTP ${code} in ${latencyMs} ms` });
        }
        finish({ status: "online", latencyMs, detail: `HTTP ${code} in ${latencyMs} ms` });
      },
    );
    request.setTimeout(TIMEOUT_MS, () => request.destroy(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" })));
    request.on("error", (error: NodeJS.ErrnoException) => {
      const reason = (error.code && ERROR_TEXT[error.code]) || error.message || "request failed";
      finish({ status: "offline", latencyMs: null, detail: `no response: ${reason}` });
    });
    request.end();
  });
}

const results = new Map<string, HealthResult>();
let running: Promise<void> | null = null;
let lastRunAt = 0;

async function runChecks(urls: string[]) {
  let next = 0;
  const workers = Array.from({ length: Math.min(MAX_PARALLEL_CHECKS, urls.length) }, async () => {
    while (next < urls.length) {
      const url = urls[next++];
      results.set(url, await check(url));
    }
  });
  await Promise.all(workers);
  // Forget URLs that are no longer in the config.
  for (const url of results.keys()) if (!urls.includes(url)) results.delete(url);
  lastRunAt = Date.now();
}

/**
 * Latest results for the services that have checks on, keyed by service id.
 * Starts a background refresh when results are older than CHECK_INTERVAL_MS
 * or a URL hasn't been checked yet. With `waitForNew`, waits for that refresh
 * when some URL has no result at all (e.g. a service that was just added).
 */
export async function getServiceHealth(
  services: Service[],
  { waitForNew = false }: { waitForNew?: boolean } = {},
): Promise<Record<string, HealthResult>> {
  const checked = services.filter((s) => s.check);
  const urls = [...new Set(checked.map((s) => s.url))];
  const isMissing = () => urls.some((url) => !results.has(url));
  const start = () => {
    running ??= runChecks(urls).finally(() => {
      running = null;
    });
    return running;
  };

  if (urls.length > 0 && (isMissing() || Date.now() - lastRunAt > CHECK_INTERVAL_MS)) void start();
  // A run already in progress may have started before a URL was added, so
  // wait for it and then for a run that includes the new URL.
  for (let attempt = 0; waitForNew && isMissing() && attempt < 2; attempt++) {
    await (running ?? start());
  }

  const byId: Record<string, HealthResult> = {};
  for (const service of checked) {
    const result = results.get(service.url);
    if (result) byId[service.id] = result;
  }
  return byId;
}
