// Shape and validation of the dashboard config (config/astrolinks.yaml).
// Used on the server for both the YAML file and the save API.
import { z } from "astro/zod";

export const serviceStatuses = ["online", "degraded", "offline"] as const;
export type ServiceStatus = (typeof serviceStatuses)[number];

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

export interface DashboardData {
  services: Service[];
  bookmarkGroups: BookmarkGroup[];
}

// Only http(s): anything else (javascript:, data:) would end up in an href.
const httpUrl = z
  .string()
  .trim()
  .refine((value) => {
    try {
      const { protocol } = new URL(value);
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  }, "must be a full URL starting with http:// or https://");

const text = (max: number) => z.string().trim().min(1, "is required").max(max, `must be at most ${max} characters`);
// `id` may be left out when editing the file by hand; one is derived from the name.
const optionalId = z.string().trim().max(100).optional();

const serviceSchema = z.object({
  id: optionalId,
  name: text(100),
  url: httpUrl,
  description: z.string().trim().max(200).default(""),
  status: z.enum(serviceStatuses).default("online"),
});

const bookmarkSchema = z.object({ id: optionalId, label: text(100), url: httpUrl });

const bookmarkGroupSchema = z.object({
  id: optionalId,
  title: text(100),
  links: z.array(bookmarkSchema).default([]),
});

const dashboardSchema = z.object({
  services: z.array(serviceSchema).default([]),
  bookmarkGroups: z.array(bookmarkGroupSchema).default([]),
});

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

/** Fills in missing ids and makes duplicates unique (`name`, `name-2`, …). */
function withIds<T extends { id?: string }>(items: T[], label: (item: T) => string): (T & { id: string })[] {
  const seen = new Set<string>();
  return items.map((item) => {
    const base = item.id || slugify(label(item));
    let id = base;
    for (let n = 2; seen.has(id); n++) id = `${base}-${n}`;
    seen.add(id);
    return { ...item, id };
  });
}

function formatPath(path: PropertyKey[]) {
  return path.reduce<string>((out, key) => (typeof key === "number" ? `${out}[${key}]` : out ? `${out}.${String(key)}` : String(key)), "");
}

export type ParseResult = { ok: true; data: DashboardData } | { ok: false; error: string };

export function parseDashboard(input: unknown): ParseResult {
  const result = dashboardSchema.safeParse(input ?? {});
  if (!result.success) {
    const issues = result.error.issues.slice(0, 5).map((issue) => `${formatPath(issue.path) || "config"}: ${issue.message}`);
    return { ok: false, error: issues.join("\n") };
  }
  const { services, bookmarkGroups } = result.data;
  return {
    ok: true,
    data: {
      services: withIds(services, (s) => s.name),
      bookmarkGroups: withIds(bookmarkGroups, (g) => g.title).map((group) => ({
        ...group,
        links: withIds(group.links, (l) => l.label),
      })),
    },
  };
}
