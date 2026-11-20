// Mock Docker stats, used until a real Docker integration exists.

export interface DockerStats {
  containers: { running: number; total: number };
  cpuPercent: number;
  memory: { usedGb: number; totalGb: number };
  network: { down: string; up: string };
  images: number;
  uptime: string;
}

export const dockerStats: DockerStats = {
  containers: { running: 12, total: 14 },
  cpuPercent: 23,
  memory: { usedGb: 6.4, totalGb: 16 },
  network: { down: "1.2 MB/s", up: "340 KB/s" },
  images: 38,
  uptime: "12d 4h",
};
