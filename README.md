# Astrolinks

A self-hosted start page for your homelab: your services, your bookmarks and your Docker host at a glance, in one dark, keyboard-friendly dashboard.

![The Astrolinks dashboard: Docker host stats along the top, a centered "Astrolinks" title with "10 of 12 services online", a grid of service cards with status badges, and four groups of bookmarks](docs/screenshot.png)

## Features

- **Services:** a card per app with its address, a short description and a live status badge (online, degraded or offline). Astrolinks checks each service's address every 30 seconds.
- **Bookmarks:** links sorted into groups.
- **Edit in the browser:** click **Edit** to add, change or remove services and bookmarks, or to move a bookmark to another group. Changes are saved on the server, so every device sees the same dashboard.
- **Plain YAML config:** everything lives in one readable file that you can also edit by hand. Comments and ordering survive saves from the dashboard.
- **Live Docker stats:** running containers, CPU, memory, network traffic, images and host uptime along the top, refreshed every few seconds.
- **Works on any screen:** responsive from phones to desktops, usable with the keyboard alone, and it respects reduced-motion settings.

## Quick start with Docker Compose

This is the recommended way to run Astrolinks. You need Docker with the Compose plugin.

```sh
git clone https://github.com/seanrobmerriam/astrolinks.git
cd astrolinks
docker compose up -d
```

Then open `http://<server-ip>:4321`.

[`compose.yaml`](compose.yaml) runs two containers:

- **astrolinks:** the dashboard. Your config is kept in the `astrolinks-data` volume, so it survives updates.
- **docker-proxy:** a [read-only proxy](https://github.com/Tecnativa/docker-socket-proxy) in front of the Docker socket. Astrolinks reads its stats through it and never touches the socket itself. The proxy refuses everything except the few read-only requests the stats need, so Astrolinks can't start, stop or remove containers. It has no published port, so only Astrolinks can reach it.

To update later:

```sh
git pull
docker compose up -d --build
```

To edit the config file by hand, open a shell in the container, or bind-mount a folder instead of the volume. The container runs as user `1000`, so the folder must be writable by that user:

```yaml
    volumes:
      - ./data:/data   # then: sudo chown 1000:1000 ./data
```

## Quick start without Docker

You need [Node.js](https://nodejs.org) 22.23 or newer, and [Bun](https://bun.sh) to install dependencies.

```sh
bun install
bun run build
HOST=0.0.0.0 bun run start
```

Then open <http://localhost:4321>, or `http://<server-ip>:4321` from another device. Without `HOST=0.0.0.0` the server only accepts connections from the machine it runs on.

On first start, Astrolinks creates `config/astrolinks.yaml` with some example services and bookmarks for you to replace.

Docker stats are read from `/var/run/docker.sock` by default, which needs a user allowed to use Docker. Without access, the stats bar says why it can't show stats, and the rest of the dashboard works normally.

## Configuration

### Environment variables

| Variable            | Default                  | Purpose                                                       |
| :------------------ | :----------------------- | :------------------------------------------------------------ |
| `ASTROLINKS_CONFIG` | `config/astrolinks.yaml` | Path to the config file, relative to the directory you start the server in. In the Docker image: `/data/astrolinks.yaml`. |
| `DOCKER_HOST`       | `unix:///var/run/docker.sock` | Where to read Docker stats: a socket (`unix:///path`) or a TCP address (`tcp://host:port`, such as the socket proxy). TLS connections aren't supported. |
| `HOST`              | `localhost`              | Address to listen on. Use `0.0.0.0` to allow other devices. The Docker image uses `0.0.0.0`. |
| `PORT`              | `4321`                   | Port to listen on.                                            |

To keep the config somewhere else, such as a mounted Docker volume:

```sh
ASTROLINKS_CONFIG=/data/astrolinks.yaml bun run start
```

### The config file

```yaml
services:
  # Shown as a card in the Services grid
  - id: jellyfin                          # optional: derived from the name if left out
    name: Jellyfin
    url: http://jellyfin.home.lan
    description: Movies, shows and music  # optional
    check: true                           # check the URL automatically (default: true)
    status: online                        # shown when check is false: online, degraded or offline

bookmarkGroups:
  - id: development                       # optional
    title: Development
    links:
      - id: github                        # optional
        label: GitHub
        url: https://github.com
```

- URLs must be full addresses starting with `http://` or `https://`.
- After editing the file by hand, reload the page to see your changes.
- If the file has a mistake, the dashboard shows exactly what's wrong (for example `services[0].url: must be a full URL starting with http:// or https://`) instead of loading. It also refuses to save until the file is fixed, so your hand edits are never overwritten.
- `config/` is git-ignored because it holds your own data.

## Service status

Every 30 seconds, while someone has the dashboard open, Astrolinks sends a request to each service's URL and shows the result:

| Badge    | When                                                                                     |
| :------- | :--------------------------------------------------------------------------------------- |
| Online   | The service answered within 2 seconds. Any answer counts, including a login page (401/403) or a redirect. |
| Degraded | It answered, but took longer than 2 seconds or returned a server error (HTTP 500).       |
| Offline  | No answer within 5 seconds (refused, unreachable, unknown host), or a reverse proxy reported the app behind it as down (HTTP 502, 503 or 504). |

Hover over a badge to see the details, such as `HTTP 200 in 84 ms` or `no response: connection refused`.

- **Self-signed certificates are fine.** Certificate errors are ignored, because this only checks whether the service answers.
- **The check runs from the Astrolinks server, not your browser.** In Docker, `localhost` means the Astrolinks container itself. Use addresses that the container can reach, such as the host's LAN IP or a hostname.
- **Setting a status by hand:** choose **Always online / degraded / offline** in the editor (or set `check: false` in the config) for services that can't be checked from the server, or that you'd rather label yourself.

## Docker stats

| Stat    | What it shows                                                                   |
| :------ | :------------------------------------------------------------------------------ |
| Running | Running containers, out of all containers.                                      |
| CPU     | CPU used by all running containers, as a share of the whole host.               |
| Memory  | Memory used by all running containers (as `docker stats` counts it), out of the host's total. |
| Network | Combined download and upload rate of all containers. Containers using `network_mode: host` aren't included. |
| Images  | Number of images on the host.                                                   |
| Uptime  | How long the host has been running.                                             |

The server checks Docker at most once every few seconds, however many people have the dashboard open, and the page stops refreshing while its tab is in the background. If Docker can't be reached, the stats bar explains why, and the dashboard keeps working.

## Security

Astrolinks has no login: **anyone who can reach it can edit it.** Keep it on your home network, or put it behind a reverse proxy that requires authentication, such as Authelia, Authentik or your proxy's basic auth.

Status checks send requests from the Astrolinks server to the URLs in your config. Anyone who can edit the dashboard can therefore find out which addresses that server can reach. This is one more reason to keep the dashboard private.

Avoid mounting the Docker socket straight into the Astrolinks container. Full socket access can control every container on the host, which effectively means root. Use the read-only proxy from `compose.yaml` instead.

## Development

```sh
bun install
bun dev   # http://localhost:4321, reloads as you edit
```

| Command         | What it does                                                    |
| :-------------- | :-------------------------------------------------------------- |
| `bun dev`       | Start the development server with hot reload.                   |
| `bun run build` | Build the production server into `dist/`.                       |
| `bun run start` | Run the built server (`dist/server/entry.mjs`).                 |
| `bun preview`   | Preview the production build locally.                           |
| `bun astro ...` | Run Astro CLI commands, such as `bun astro check`.              |
| `docker compose up -d --build` | Build the image and run it with the Docker proxy. |

### How it's built

[Astro](https://astro.build) renders each page on the server with the [`@astrojs/node`](https://docs.astro.build/en/guides/integrations-guide/node/) adapter, and [Tailwind CSS](https://tailwindcss.com) v4 handles styling.

```text
src/
├── components/     Page sections (Header, Hero, Services, Bookmarks, Editor) and ui/ building blocks
├── data/           Starter content for new config files
├── layouts/        The HTML page shell
├── lib/            Config schema and YAML file handling, service status checks, the Docker stats client, shared helpers
├── middleware.ts   Loads the config for each page request
├── pages/          index.astro, and api/config.ts for saving changes
├── scripts/        Browser code for edit mode, live service status and the stats bar
└── styles/         Design tokens (colors, fonts, radii) and global styles
```

Contributor conventions (design tokens, components, accessibility) are in [AGENTS.md](AGENTS.md).
