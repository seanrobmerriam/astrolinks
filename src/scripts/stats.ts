// Keeps the Docker stats bar current by polling /api/docker.
import { statViews, type DockerStatsResult, type StatKey } from "../lib/stats-format";

const REFRESH_MS = 5_000;

const section = document.querySelector<HTMLElement>("[data-docker-stats]");

function apply(result: DockerStatsResult) {
  if (!section) return;
  const grid = section.querySelector<HTMLElement>("[data-stats-grid]")!;
  const errorBox = section.querySelector<HTMLElement>("[data-stats-error]")!;

  if (!result.ok) {
    section.querySelector("[data-field='stats-error']")!.textContent = result.error;
    grid.hidden = true;
    errorBox.hidden = false;
    return;
  }

  const views = statViews(result.stats);
  for (const [stat, view] of Object.entries(views) as [StatKey, (typeof views)[StatKey]][]) {
    const item = grid.querySelector(`[data-stat="${stat}"]`);
    if (!item) continue;
    item.querySelector("[data-stat-value]")!.textContent = view.value;
    item.querySelector("[data-stat-detail]")!.textContent = view.detail;
    const meter = item.querySelector<HTMLElement>("[data-meter]");
    if (meter && view.percent !== undefined) meter.style.width = `${Math.min(100, Math.max(0, view.percent))}%`;
  }
  grid.hidden = false;
  errorBox.hidden = true;
}

let timer: number | undefined;

async function refresh() {
  window.clearTimeout(timer);
  try {
    const response = await fetch("/api/docker", { cache: "no-store" });
    apply((await response.json()) as DockerStatsResult);
  } catch {
    apply({ ok: false, error: "Lost the connection to the Astrolinks server." });
  }
  // Don't poll while the tab is in the background.
  if (!document.hidden) timer = window.setTimeout(refresh, REFRESH_MS);
}

if (section) {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) window.clearTimeout(timer);
    else void refresh();
  });
  void refresh();
}
