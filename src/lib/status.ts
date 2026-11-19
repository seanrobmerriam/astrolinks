import type { ServiceStatus } from "../data/mock";

// Complete class strings so Tailwind can detect them. Shared by the
// StatusBadge component (server render) and the editor script (client render).
export const statusBadgeBase = "inline-flex items-center gap-1.5 font-mono text-xs editing:invisible";
export const statusDotBase = "size-2 rounded-full";

export const statusStyles: Record<ServiceStatus, { dot: string; text: string; label: string }> = {
  online: { dot: "bg-success", text: "text-success", label: "Online" },
  degraded: { dot: "bg-warning", text: "text-warning", label: "Degraded" },
  offline: { dot: "bg-danger", text: "text-danger", label: "Offline" },
};

export const statusOptions = (Object.keys(statusStyles) as ServiceStatus[]).map((value) => ({
  value,
  label: statusStyles[value].label,
}));
