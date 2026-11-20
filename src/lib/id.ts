/** crypto.randomUUID only exists on secure origins; self-hosted dashboards are often plain http. */
export function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
