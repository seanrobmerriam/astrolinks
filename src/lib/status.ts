import type { ServiceStatus } from "./schema";

/** What a badge can show: a service status, or "unknown" before the first check. */
export type DisplayStatus = ServiceStatus | "unknown";

// Complete class strings so Tailwind can detect them. Shared by the
// StatusBadge component (server render) and the browser scripts.
export const statusBadgeBase = "inline-flex items-center gap-1.5 font-mono text-xs editing:invisible";
export const statusDotBase = "size-2 rounded-full";

export const statusStyles: Record<DisplayStatus, { dot: string; text: string; label: string }> = {
  online: { dot: "bg-success", text: "text-success", label: "Online" },
  degraded: { dot: "bg-warning", text: "text-warning", label: "Degraded" },
  offline: { dot: "bg-danger", text: "text-danger", label: "Offline" },
  unknown: { dot: "bg-muted motion-safe:animate-pulse", text: "text-muted", label: "Checking" },
};

/** Options for the editor's Status field. "auto" means check the URL. */
export const statusOptions = [
  { value: "auto", label: "Check automatically" },
  { value: "online", label: "Always online" },
  { value: "degraded", label: "Always degraded" },
  { value: "offline", label: "Always offline" },
];

export interface CheckResult {
  status: ServiceStatus;
  detail: string;
}

/** The status to show for a service, given its settings and its latest check result. */
export function displayStatus(
  service: { check: boolean; status: ServiceStatus },
  result: CheckResult | undefined,
): { status: DisplayStatus; detail: string } {
  if (!service.check) return { status: service.status, detail: "set by hand" };
  if (!result) return { status: "unknown", detail: "not checked yet" };
  return { status: result.status, detail: result.detail };
}
