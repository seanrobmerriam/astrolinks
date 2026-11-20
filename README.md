# Astrolinks

A self-hosted dashboard for your services and bookmarks, built with Astro.

## Running

```sh
bun install
bun run build
bun run start   # http://localhost:4321; set HOST=0.0.0.0 to reach it from other devices, PORT to change the port
```

For development, `bun dev` runs the same app with hot reload.

## Configuration

Services and bookmarks live in `config/astrolinks.yaml`, relative to the directory you start the server from. Set `ASTROLINKS_CONFIG` to use another path, for example a mounted Docker volume:

```sh
ASTROLINKS_CONFIG=/data/astrolinks.yaml bun run start
```

- The file is created with starter content on first run.
- **Edit** in the dashboard saves to this file. You can also edit it by hand: comments and ordering are kept when the dashboard saves, and a reload picks up your changes.
- URLs must start with `http://` or `https://`. Each item's `id` is optional and is derived from its name when left out.
- If the file has a mistake, the dashboard shows the problem instead of loading, and refuses to save until it is fixed, so your edits are never overwritten.
- The dashboard has no login: anyone who can reach it can edit it. Keep it on your local network or behind an authenticating proxy.
- `config/` is git-ignored, since it holds your own data.

---

# Astro Starter Kit: Basics

```sh
bun create astro@latest -- --template basics
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src
│   ├── assets
│   │   └── astro.svg
│   ├── components
│   │   └── Welcome.astro
│   ├── layouts
│   │   └── Layout.astro
│   └── pages
│       └── index.astro
└── package.json
```

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `bun install`             | Installs dependencies                            |
| `bun dev`             | Starts local dev server at `localhost:4321`      |
| `bun build`           | Build your production site to `./dist/`          |
| `bun preview`         | Preview your build locally, before deploying     |
| `bun run start`       | Run the built server (`dist/server/entry.mjs`)   |
| `bun astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `bun astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
