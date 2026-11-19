// Mock data used until real Docker and config integrations exist.

export type ServiceStatus = "online" | "degraded" | "offline";

export interface Service {
  id: string;
  name: string;
  url: string;
  description: string;
  status: ServiceStatus;
}

export interface Bookmark {
  id: string;
  label: string;
  url: string;
}

export interface BookmarkGroup {
  id: string;
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
  { id: "jellyfin", name: "Jellyfin", url: "http://jellyfin.home.lan", description: "Movies, shows and music", status: "online" },
  { id: "home-assistant", name: "Home Assistant", url: "http://ha.home.lan", description: "Home automation hub", status: "online" },
  { id: "nextcloud", name: "Nextcloud", url: "http://cloud.home.lan", description: "Files, calendar and contacts", status: "online" },
  { id: "gitea", name: "Gitea", url: "http://git.home.lan", description: "Self-hosted Git forge", status: "online" },
  { id: "portainer", name: "Portainer", url: "http://portainer.home.lan", description: "Container management", status: "online" },
  { id: "pi-hole", name: "Pi-hole", url: "http://pihole.home.lan", description: "Network-wide ad blocking", status: "degraded" },
  { id: "vaultwarden", name: "Vaultwarden", url: "http://vault.home.lan", description: "Password manager", status: "online" },
  { id: "grafana", name: "Grafana", url: "http://grafana.home.lan", description: "Metrics and dashboards", status: "online" },
  { id: "immich", name: "Immich", url: "http://photos.home.lan", description: "Photo and video backup", status: "offline" },
  { id: "uptime-kuma", name: "Uptime Kuma", url: "http://status.home.lan", description: "Uptime monitoring", status: "online" },
  { id: "paperless-ngx", name: "Paperless-ngx", url: "http://docs.home.lan", description: "Document archive", status: "online" },
  { id: "sonarr", name: "Sonarr", url: "http://sonarr.home.lan", description: "TV series management", status: "online" },
];

export const bookmarkGroups: BookmarkGroup[] = [
  {
    id: "development",
    title: "Development",
    links: [
      { id: "github", label: "GitHub", url: "https://github.com" },
      { id: "astro-docs", label: "Astro Docs", url: "https://docs.astro.build" },
      { id: "tailwind-css", label: "Tailwind CSS", url: "https://tailwindcss.com/docs" },
      { id: "mdn-web-docs", label: "MDN Web Docs", url: "https://developer.mozilla.org" },
    ],
  },
  {
    id: "infrastructure",
    title: "Infrastructure",
    links: [
      { id: "docker-hub", label: "Docker Hub", url: "https://hub.docker.com" },
      { id: "cloudflare", label: "Cloudflare", url: "https://dash.cloudflare.com" },
      { id: "tailscale", label: "Tailscale", url: "https://login.tailscale.com/admin" },
    ],
  },
  {
    id: "reading",
    title: "Reading",
    links: [
      { id: "hacker-news", label: "Hacker News", url: "https://news.ycombinator.com" },
      { id: "lobsters", label: "Lobsters", url: "https://lobste.rs" },
      { id: "r-selfhosted", label: "r/selfhosted", url: "https://www.reddit.com/r/selfhosted" },
    ],
  },
  {
    id: "media",
    title: "Media",
    links: [
      { id: "youtube", label: "YouTube", url: "https://www.youtube.com" },
      { id: "bandcamp", label: "Bandcamp", url: "https://bandcamp.com" },
      { id: "letterboxd", label: "Letterboxd", url: "https://letterboxd.com" },
    ],
  },
];
