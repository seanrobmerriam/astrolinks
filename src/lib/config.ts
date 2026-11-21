// Server-only: reads and writes the dashboard config file.
//
// - The file is YAML so it can be edited by hand. Saves from the UI patch the
//   existing YAML document in place, so comments and key order survive.
// - Writes go to a temp file that is then renamed over the original, so a crash
//   mid-write never leaves a half-written config behind.
// - Writes are serialized within this process; the last save wins.
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { Document, isMap, isScalar, isSeq, parseDocument, type Node } from "yaml";
import { defaultDashboard } from "../data/defaults";
import { parseDashboard, type DashboardData } from "./schema";

export const CONFIG_PATH = path.resolve(process.env.ASTROLINKS_CONFIG || "config/astrolinks.yaml");

const HEADER = ` Astrolinks dashboard config.
 Edit mode in the dashboard saves here, and you can edit this file by hand too:
 comments and ordering are kept when the dashboard saves.
 - URLs must start with http:// or https://
 - id is optional; when left out it is derived from the name, label or title
 - status is one of: online, degraded, offline`;

export class ConfigError extends Error {}

const isErrno = (error: unknown, code: string) => (error as NodeJS.ErrnoException | null)?.code === code;

async function readText(): Promise<string | null> {
  try {
    return await readFile(CONFIG_PATH, "utf8");
  } catch (error) {
    if (isErrno(error, "ENOENT")) return null;
    throw error;
  }
}

function parseText(text: string): { doc: Document; data: DashboardData } {
  const doc = parseDocument(text, { prettyErrors: true });
  if (doc.errors.length > 0) {
    throw new ConfigError(`${CONFIG_PATH} is not valid YAML:\n${doc.errors[0].message}`);
  }
  const result = parseDashboard(doc.toJS());
  if (!result.ok) throw new ConfigError(`${CONFIG_PATH} has invalid values:\n${result.error}`);
  return { doc, data: result.data };
}

async function writeAtomically(contents: string) {
  await mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  const temp = `${CONFIG_PATH}.${process.pid}.${Date.now()}.tmp`;
  try {
    await writeFile(temp, contents, "utf8");
    await rename(temp, CONFIG_PATH);
  } catch (error) {
    await rm(temp, { force: true }).catch(() => undefined);
    if (isErrno(error, "EACCES") || isErrno(error, "EPERM") || isErrno(error, "EROFS")) {
      throw new ConfigError(
        `Astrolinks can't write ${CONFIG_PATH} (${(error as NodeJS.ErrnoException).code}).\n` +
          `Make the folder writable by the user Astrolinks runs as. In Docker that is user 1000: sudo chown 1000:1000 <folder>`,
      );
    }
    throw error;
  }
}

function newDocument(data: DashboardData) {
  const doc = new Document(data);
  doc.commentBefore = HEADER;
  return doc;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Updates `node` to hold `value`, reusing existing nodes where possible so their
 * comments stay attached. Items in lists are matched by `id`.
 */
function patch(doc: Document, node: unknown, value: unknown): unknown {
  if (Array.isArray(value) && isSeq(node)) {
    const byId = new Map<unknown, Node>();
    for (const item of node.items) if (isMap(item)) byId.set(item.get("id"), item);
    node.items = value.map((entry) => {
      const existing = isPlainObject(entry) ? byId.get(entry.id) : undefined;
      return existing ? patch(doc, existing, entry) : doc.createNode(entry);
    });
    return node;
  }
  if (isPlainObject(value) && isMap(node)) {
    for (const [key, child] of Object.entries(value)) {
      const current = node.get(key, true);
      node.set(key, current === undefined ? doc.createNode(child) : patch(doc, current, child));
    }
    for (const pair of [...node.items]) {
      const key = isScalar(pair.key) ? pair.key.value : pair.key;
      if (typeof key === "string" && !(key in value)) node.delete(key);
    }
    return node;
  }
  if (isScalar(node) && (value === null || typeof value !== "object")) {
    node.value = value;
    return node;
  }
  return doc.createNode(value);
}

/**
 * Writes the ids that parseDashboard derived (for entries written without an
 * `id`, or with a duplicate one) into the matching YAML nodes. Without this,
 * patch() could not match those entries and would replace them, dropping
 * their comments. Lists keep their order through parsing, so index i in the
 * file is index i in `parsed`.
 */
function stampIds(doc: Document, parsed: DashboardData) {
  const stamp = (seq: unknown, items: { id: string }[]) => {
    if (!isSeq(seq)) return;
    seq.items.forEach((node, i) => {
      const id = items[i]?.id;
      if (!isMap(node) || id === undefined || node.get("id") === id) return;
      if (node.has("id")) node.set("id", id);
      else node.items.unshift(doc.createPair("id", id));
    });
  };
  stamp(doc.get("services", true), parsed.services);
  const groups = doc.get("bookmarkGroups", true);
  stamp(groups, parsed.bookmarkGroups);
  if (isSeq(groups)) {
    groups.items.forEach((group, i) => {
      const links = parsed.bookmarkGroups[i]?.links;
      if (isMap(group) && links) stamp(group.get("links", true), links);
    });
  }
}

/** Reads the config, creating it from the starter content on first run. */
export async function readConfig(): Promise<DashboardData> {
  const text = await readText();
  if (text === null) {
    const data = defaultDashboard();
    await writeQueued(data);
    return data;
  }
  return parseText(text).data;
}

let queue: Promise<unknown> = Promise.resolve();

function writeQueued(data: DashboardData): Promise<DashboardData> {
  const run = queue.then(async () => {
    const text = await readText();
    // parseText throws on a file that was broken by hand, so a save never
    // overwrites (and loses) the user's edits; they fix the file first.
    let doc: Document;
    if (text === null) {
      doc = newDocument(data);
    } else {
      const current = parseText(text);
      doc = current.doc;
      stampIds(doc, current.data);
    }
    if (text !== null) doc.contents = patch(doc, doc.contents, data) as Document["contents"];
    await writeAtomically(doc.toString({ lineWidth: 0 }));
    return data;
  });
  queue = run.catch(() => undefined);
  return run;
}

/** Validates and saves the whole dashboard. Returns the data as stored. */
export async function writeConfig(input: unknown): Promise<DashboardData> {
  const result = parseDashboard(input);
  if (!result.ok) throw new ConfigError(result.error);
  return writeQueued(result.data);
}
