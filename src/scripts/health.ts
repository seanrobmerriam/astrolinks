// Keeps service status badges and the "n of m services online" count current
// by polling /api/status. The editor script also uses applyHealth() after it
// redraws cards, and refreshHealth() after a save adds or changes a service.
import type { HealthResult } from "../lib/health";
import type { ServiceStatus } from "../lib/schema";
import { displayStatus, statusBadgeBase, statusDotBase, statusStyles } from "../lib/status";

const DEFAULT_INTERVAL_MS = 30_000;

let results: Record<string, HealthResult> = JSON.parse(document.getElementById("service-health")?.textContent || "{}");
let intervalMs = DEFAULT_INTERVAL_MS;
let timer: number | undefined;

/** Updates every service card's badge from its data-check / data-manual-status settings and the latest results. */
export function applyHealth() {
  const items = document.querySelectorAll<HTMLElement>("[data-service-list] li[data-id]");
  let online = 0;
  for (const item of items) {
    const shown = displayStatus(
      { check: item.dataset.check !== "false", status: (item.dataset.manualStatus ?? "online") as ServiceStatus },
      results[item.dataset.id ?? ""],
    );
    if (shown.status === "online") online++;
    item.dataset.shownStatus = shown.status;

    const style = statusStyles[shown.status];
    const badge = item.querySelector<HTMLElement>("[data-status]");
    if (!badge) continue;
    badge.className = `${statusBadgeBase} ${style.text}`;
    badge.title = shown.detail;
    badge.querySelector("[data-status-dot]")!.className = `${statusDotBase} ${style.dot}`;
    badge.querySelector("[data-field='status-label']")!.textContent = style.label;
    badge.querySelector("[data-field='status-detail']")!.textContent = `, ${shown.detail}`;
  }
  const onlineCount = document.querySelector("[data-field='online-count']");
  const totalCount = document.querySelector("[data-field='total-count']");
  if (onlineCount) onlineCount.textContent = String(online);
  if (totalCount) totalCount.textContent = String(items.length);
}

/** Fetches the latest results now, then keeps polling while the page is visible. */
export async function refreshHealth() {
  window.clearTimeout(timer);
  try {
    const response = await fetch("/api/status", { cache: "no-store" });
    if (response.ok) {
      const body = (await response.json()) as { results: Record<string, HealthResult>; intervalMs?: number };
      results = body.results;
      intervalMs = body.intervalMs ?? DEFAULT_INTERVAL_MS;
      applyHealth();
    }
  } catch {
    // Keep showing the last known results; the next poll tries again.
  }
  if (!document.hidden) timer = window.setTimeout(refreshHealth, intervalMs);
}

if (document.querySelector("[data-service-list]")) {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) window.clearTimeout(timer);
    else void refreshHealth();
  });
  void refreshHealth();
}
