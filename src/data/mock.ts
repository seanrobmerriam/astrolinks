// Mock data used until real Docker and config integrations exist.

export type ServiceStatus = "online" | "degraded" | "offline";

export interface Service {
  name: string;
  url: string;
  description: string;
  status: ServiceStatus;
}

export interface Bookmark {
  label: string;
  url: string;
}

export interface BookmarkGroup {
  title: string;
  links: Bookmark[];
}

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

export const services: Service[] = [
  { name: "Jellyfin", url: "http://jellyfin.home.lan", description: "Movies, shows and music", status: "online" },
  { name: "Home Assistant", url: "http://ha.home.lan", description: "Home automation hub", status: "online" },
  { name: "Nextcloud", url: "http://cloud.home.lan", description: "Files, calendar and contacts", status: "online" },
  { name: "Gitea", url: "http://git.home.lan", description: "Self-hosted Git forge", status: "online" },
  { name: "Portainer", url: "http://portainer.home.lan", description: "Container management", status: "online" },
  { name: "Pi-hole", url: "http://pihole.home.lan", description: "Network-wide ad blocking", status: "degraded" },
  { name: "Vaultwarden", url: "http://vault.home.lan", description: "Password manager", status: "online" },
  { name: "Grafana", url: "http://grafana.home.lan", description: "Metrics and dashboards", status: "online" },
  { name: "Immich", url: "http://photos.home.lan", description: "Photo and video backup", status: "offline" },
  { name: "Uptime Kuma", url: "http://status.home.lan", description: "Uptime monitoring", status: "online" },
  { name: "Paperless-ngx", url: "http://docs.home.lan", description: "Document archive", status: "online" },
  { name: "Sonarr", url: "http://sonarr.home.lan", description: "TV series management", status: "online" },
];

export const bookmarkGroups: BookmarkGroup[] = [
  {
    title: "Development",
    links: [
      { label: "GitHub", url: "https://github.com" },
      { label: "Astro Docs", url: "https://docs.astro.build" },
      { label: "Tailwind CSS", url: "https://tailwindcss.com/docs" },
      { label: "MDN Web Docs", url: "https://developer.mozilla.org" },
    ],
  },
  {
    title: "Infrastructure",
    links: [
      { label: "Docker Hub", url: "https://hub.docker.com" },
      { label: "Cloudflare", url: "https://dash.cloudflare.com" },
      { label: "Tailscale", url: "https://login.tailscale.com/admin" },
    ],
  },
  {
    title: "Reading",
    links: [
      { label: "Hacker News", url: "https://news.ycombinator.com" },
      { label: "Lobsters", url: "https://lobste.rs" },
      { label: "r/selfhosted", url: "https://www.reddit.com/r/selfhosted" },
    ],
  },
  {
    title: "Media",
    links: [
      { label: "YouTube", url: "https://www.youtube.com" },
      { label: "Bandcamp", url: "https://bandcamp.com" },
      { label: "Letterboxd", url: "https://letterboxd.com" },
    ],
  },
];
