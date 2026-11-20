// Server-only: reads stats from the Docker Engine API.
//
// Connects to DOCKER_HOST: unix:///var/run/docker.sock by default, or
// tcp://host:port, e.g. the read-only socket proxy in compose.yaml. Only GET
// requests are made: /info, /containers/json and /containers/{id}/stats.
//
// CPU and network are rates, so they come from the difference between two
// samples. Results are cached briefly so many open dashboards cost one sample.
import http from "node:http";
import os from "node:os";
import type { DockerStats, DockerStatsResult } from "./stats-format";

const REQUEST_TIMEOUT_MS = 5_000;
const CACHE_MS = 4_000;
/** Older samples are too far apart for a meaningful "current" rate. */
const MAX_SAMPLE_GAP_MS = 60_000;
const FIRST_SAMPLE_GAP_MS = 1_000;
const MAX_PARALLEL_REQUESTS = 8;

interface Target {
  label: string;
  options: http.RequestOptions;
}

function resolveTarget(): Target {
  const raw = process.env.DOCKER_HOST || "unix:///var/run/docker.sock";
  if (raw.startsWith("unix://")) {
    const socketPath = raw.slice("unix://".length);
    return { label: socketPath, options: { socketPath } };
  }
  if (raw.startsWith("tcp://") || raw.startsWith("http://")) {
    const url = new URL(raw.replace(/^tcp:/, "http:"));
    return { label: url.host, options: { host: url.hostname, port: Number(url.port) || 2375 } };
  }
  throw new Error(`DOCKER_HOST "${raw}" is not supported. Use unix:///path/to/docker.sock or tcp://host:port.`);
}

function describeError(error: unknown, target: Target, path: string): string {
  const code = (error as NodeJS.ErrnoException | null)?.code;
  switch (code) {
    case "ENOENT":
      return `No Docker socket at ${target.label}. Mount it into the container or set DOCKER_HOST.`;
    case "EACCES":
      return `No permission to use the Docker socket at ${target.label}.`;
    case "ECONNREFUSED":
      return `Nothing is accepting connections at ${target.label}. Check that Docker (or the socket proxy) is running.`;
    case "ENOTFOUND":
    case "EAI_AGAIN":
      return `Can't reach ${target.label}. Check that the socket proxy container is running and DOCKER_HOST is right.`;
    case "ETIMEDOUT":
      return `Docker at ${target.label} didn't answer within ${REQUEST_TIMEOUT_MS / 1000}s.`;
  }
  return error instanceof Error ? error.message : `Request to Docker for ${path} failed.`;
}

function dockerGet<T>(target: Target, path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = http.request({ ...target.options, path, method: "GET", headers: { Host: "docker" } }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => chunks.push(chunk));
      response.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        const status = response.statusCode ?? 0;
        if (status === 403) {
          return reject(new Error(`Docker refused ${path.split("?")[0]} (403). If you use a socket proxy, enable INFO=1 and CONTAINERS=1.`));
        }
        if (status < 200 || status >= 300) {
          let message = body.trim();
          try {
            message = JSON.parse(body).message ?? message;
          } catch {}
          return reject(new Error(`Docker answered ${status} for ${path.split("?")[0]}: ${message || "no details"}`));
        }
        try {
          resolve(JSON.parse(body) as T);
        } catch {
          reject(new Error(`Docker sent an unreadable answer for ${path.split("?")[0]}.`));
        }
      });
      response.on("error", (error) => reject(new Error(describeError(error, target, path))));
    });
    request.setTimeout(REQUEST_TIMEOUT_MS, () => request.destroy(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" })));
    request.on("error", (error) => reject(new Error(describeError(error, target, path))));
    request.end();
  });
}

// Only the fields we use from the Docker Engine API.
interface DockerInfo {
  Containers: number;
  ContainersRunning: number;
  Images: number;
  MemTotal: number;
}

interface DockerContainer {
  Id: string;
}

interface DockerContainerStats {
  cpu_stats?: { cpu_usage?: { total_usage?: number }; system_cpu_usage?: number };
  memory_stats?: { usage?: number; stats?: Record<string, number> };
  networks?: Record<string, { rx_bytes?: number; tx_bytes?: number }>;
}

interface ContainerSample {
  cpu: number;
  system: number | null;
  rx: number;
  tx: number;
  hasNetwork: boolean;
  memory: number;
}

interface Sample {
  at: number;
  info: DockerInfo;
  containers: Map<string, ContainerSample>;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

/** Memory in use the way `docker stats` counts it: usage minus reclaimable page cache. */
function memoryInUse(memory: DockerContainerStats["memory_stats"]): number {
  const usage = memory?.usage ?? 0;
  const stats = memory?.stats ?? {};
  const cache = stats.inactive_file ?? stats.total_inactive_file ?? stats.cache ?? 0;
  return Math.max(0, usage - cache);
}

function toContainerSample(stats: DockerContainerStats): ContainerSample {
  const networks = Object.values(stats.networks ?? {});
  return {
    cpu: stats.cpu_stats?.cpu_usage?.total_usage ?? 0,
    system: stats.cpu_stats?.system_cpu_usage ?? null,
    rx: networks.reduce((sum, n) => sum + (n.rx_bytes ?? 0), 0),
    tx: networks.reduce((sum, n) => sum + (n.tx_bytes ?? 0), 0),
    hasNetwork: networks.length > 0,
    memory: memoryInUse(stats.memory_stats),
  };
}

async function takeSample(target: Target): Promise<Sample> {
  const [info, running] = await Promise.all([
    dockerGet<DockerInfo>(target, "/info"),
    dockerGet<DockerContainer[]>(target, "/containers/json"),
  ]);
  const containers = new Map<string, ContainerSample>();
  await mapLimit(running, MAX_PARALLEL_REQUESTS, async ({ Id }) => {
    try {
      // one-shot: return immediately instead of waiting for Docker's own second sample.
      const stats = await dockerGet<DockerContainerStats>(target, `/containers/${Id}/stats?stream=false&one-shot=true`);
      containers.set(Id, toContainerSample(stats));
    } catch {
      // The container may have stopped between the two requests; skip it.
    }
  });
  return { at: Date.now(), info, containers };
}

function summarize(current: Sample, previous: Sample | null): DockerStats {
  let cpuFraction = 0;
  let rx = 0;
  let tx = 0;
  let compared = 0;
  const seconds = previous ? (current.at - previous.at) / 1000 : 0;

  if (previous && seconds > 0) {
    for (const [id, now] of current.containers) {
      const before = previous.containers.get(id);
      if (!before) continue;
      compared++;
      if (now.system !== null && before.system !== null && now.system > before.system) {
        cpuFraction += Math.max(0, now.cpu - before.cpu) / (now.system - before.system);
      }
      // Counters reset when a container restarts; ignore negative deltas.
      rx += Math.max(0, now.rx - before.rx);
      tx += Math.max(0, now.tx - before.tx);
    }
  }
  const haveRates = previous !== null && seconds > 0 && (compared > 0 || current.containers.size === 0);
  const memoryUsed = [...current.containers.values()].reduce((sum, c) => sum + c.memory, 0);

  return {
    containers: { running: current.info.ContainersRunning, total: current.info.Containers },
    images: current.info.Images,
    cpuPercent: haveRates ? Math.min(100, cpuFraction * 100) : null,
    memory: { usedBytes: memoryUsed, totalBytes: current.info.MemTotal },
    network: {
      rxBytesPerSec: haveRates ? rx / seconds : null,
      txBytesPerSec: haveRates ? tx / seconds : null,
    },
    // Inside a container on Linux this is still the host's uptime (/proc/uptime isn't namespaced).
    uptimeSeconds: Math.round(os.uptime()),
  };
}

let lastSample: Sample | null = null;
let cached: { at: number; result: DockerStatsResult } | null = null;
let inFlight: Promise<DockerStatsResult> | null = null;

async function refresh(): Promise<DockerStatsResult> {
  try {
    const target = resolveTarget();
    let previous = lastSample && Date.now() - lastSample.at <= MAX_SAMPLE_GAP_MS ? lastSample : null;
    if (!previous) {
      // No recent sample to compare with: take one now, so the first answer already has rates.
      previous = await takeSample(target);
      await new Promise((resolve) => setTimeout(resolve, FIRST_SAMPLE_GAP_MS));
    }
    const current = await takeSample(target);
    lastSample = current;
    return { ok: true, stats: summarize(current, previous) };
  } catch (error) {
    lastSample = null;
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/** Current stats, sampling Docker at most every few seconds however many clients ask. */
export function getDockerStats(): Promise<DockerStatsResult> {
  if (cached && Date.now() - cached.at < CACHE_MS) return Promise.resolve(cached.result);
  inFlight ??= refresh()
    .then((result) => {
      cached = { at: Date.now(), result };
      return result;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/** The latest stats if there are any, without waiting. Starts a refresh in the background. */
export function peekDockerStats(): DockerStatsResult | null {
  const result = cached?.result ?? null;
  void getDockerStats();
  return result;
}
