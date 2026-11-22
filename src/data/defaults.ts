// Starter content written to config/astrolinks.yaml the first time Astrolinks runs.
import type { BookmarkGroup, DashboardData, Service } from "../lib/schema";

export function defaultDashboard(): DashboardData {
  return structuredClone({ services, bookmarkGroups });
}

const services: Service[] = [
  { id: "jellyfin", name: "Jellyfin", url: "http://jellyfin.home.lan", description: "Movies, shows and music", check: true, status: "online" },
  { id: "home-assistant", name: "Home Assistant", url: "http://ha.home.lan", description: "Home automation hub", check: true, status: "online" },
  { id: "nextcloud", name: "Nextcloud", url: "http://cloud.home.lan", description: "Files, calendar and contacts", check: true, status: "online" },
  { id: "gitea", name: "Gitea", url: "http://git.home.lan", description: "Self-hosted Git forge", check: true, status: "online" },
  { id: "portainer", name: "Portainer", url: "http://portainer.home.lan", description: "Container management", check: true, status: "online" },
  { id: "pi-hole", name: "Pi-hole", url: "http://pihole.home.lan", description: "Network-wide ad blocking", check: true, status: "online" },
  { id: "vaultwarden", name: "Vaultwarden", url: "http://vault.home.lan", description: "Password manager", check: true, status: "online" },
  { id: "grafana", name: "Grafana", url: "http://grafana.home.lan", description: "Metrics and dashboards", check: true, status: "online" },
  { id: "immich", name: "Immich", url: "http://photos.home.lan", description: "Photo and video backup", check: true, status: "online" },
  { id: "uptime-kuma", name: "Uptime Kuma", url: "http://status.home.lan", description: "Uptime monitoring", check: true, status: "online" },
  { id: "paperless-ngx", name: "Paperless-ngx", url: "http://docs.home.lan", description: "Document archive", check: true, status: "online" },
  { id: "sonarr", name: "Sonarr", url: "http://sonarr.home.lan", description: "TV series management", check: true, status: "online" },
];

const bookmarkGroups: BookmarkGroup[] = [
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
