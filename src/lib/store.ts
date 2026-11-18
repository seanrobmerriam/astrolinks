import { bookmarkGroups, services, type BookmarkGroup, type Service } from "../data/mock";

export interface DashboardData {
  services: Service[];
  bookmarkGroups: BookmarkGroup[];
}

const STORAGE_KEY = "astrolinks:data:v1";

export function defaultData(): DashboardData {
  return structuredClone({ services, bookmarkGroups });
}

const isString = (value: unknown): value is string => typeof value === "string";

function isDashboardData(value: unknown): value is DashboardData {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<DashboardData>;
  return (
    Array.isArray(data.services) &&
    data.services.every((s) => isString(s?.id) && isString(s?.name) && isString(s?.url)) &&
    Array.isArray(data.bookmarkGroups) &&
    data.bookmarkGroups.every(
      (g) => isString(g?.id) && isString(g?.title) && Array.isArray(g?.links) && g.links.every((l) => isString(l?.id) && isString(l?.label) && isString(l?.url)),
    )
  );
}

/** Returns saved data, or null when nothing valid is stored (or storage is unavailable). */
export function loadData(): DashboardData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isDashboardData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Returns false when the browser refuses to store (private mode, quota, blocked storage). */
export function saveData(data: DashboardData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/** crypto.randomUUID only exists on secure origins; self-hosted dashboards are often plain http. */
export function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
