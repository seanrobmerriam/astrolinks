// Docker stats types and display formatting. Shared by the server render and
// the browser script that refreshes the stats bar, so both show the same text.

export interface DockerStats {
  containers: { running: number; total: number };
  images: number;
  /** Share of total host CPU used by running containers, 0–100. Null until two samples exist. */
  cpuPercent: number | null;
  memory: { usedBytes: number; totalBytes: number };
  /** Combined container network traffic. Null until two samples exist. */
  network: { rxBytesPerSec: number | null; txBytesPerSec: number | null };
  /** Host uptime in seconds. */
  uptimeSeconds: number;
}

export type DockerStatsResult = { ok: true; stats: DockerStats } | { ok: false; error: string };

export type StatKey = "running" | "cpu" | "memory" | "network" | "images" | "uptime";

export interface StatView {
  value: string;
  detail: string;
  /** Meter fill, 0–100; undefined for stats without a meter. */
  percent?: number;
}

const PLACEHOLDER = "—";
const UNITS = ["B", "KB", "MB", "GB", "TB"];

export function formatBytes(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  const digits = value >= 100 || unit === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${UNITS[unit]}`;
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Non-breaking spaces keep "↑ 340 KB/s" together when the column wraps.
const nowrap = (text: string) => text.replaceAll(" ", " ");
const rate = (bytesPerSec: number | null) => (bytesPerSec === null ? PLACEHOLDER : `${formatBytes(bytesPerSec)}/s`);
const percentOf = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);

/** Text and meter values for each stat; `null` stats give placeholders. */
export function statViews(stats: DockerStats | null): Record<StatKey, StatView> {
  if (!stats) {
    return {
      running: { value: PLACEHOLDER, detail: "", percent: 0 },
      cpu: { value: PLACEHOLDER, detail: "", percent: 0 },
      memory: { value: PLACEHOLDER, detail: "", percent: 0 },
      network: { value: PLACEHOLDER, detail: "" },
      images: { value: PLACEHOLDER, detail: "" },
      uptime: { value: PLACEHOLDER, detail: "" },
    };
  }
  const { containers, cpuPercent, memory, network } = stats;
  return {
    running: {
      value: String(containers.running),
      detail: ` / ${containers.total}`,
      percent: percentOf(containers.running, containers.total),
    },
    cpu: {
      value: cpuPercent === null ? PLACEHOLDER : `${cpuPercent < 10 ? cpuPercent.toFixed(1) : Math.round(cpuPercent)}%`,
      detail: "",
      percent: cpuPercent ?? 0,
    },
    memory: {
      value: formatBytes(memory.usedBytes),
      detail: ` / ${formatBytes(memory.totalBytes)}`,
      percent: percentOf(memory.usedBytes, memory.totalBytes),
    },
    network: {
      value: nowrap(`↓ ${rate(network.rxBytesPerSec)}`),
      detail: ` ${nowrap(`↑ ${rate(network.txBytesPerSec)}`)}`,
    },
    images: { value: String(stats.images), detail: "" },
    uptime: { value: formatUptime(stats.uptimeSeconds), detail: "" },
  };
}
