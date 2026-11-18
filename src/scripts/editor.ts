// Dashboard edit mode: add, edit and remove services and bookmarks.
// Data lives in localStorage (see lib/store.ts); markup comes from the
// <template> elements that Services.astro and Bookmarks.astro render, so the
// client never duplicates the components' class lists.
import type { Bookmark, BookmarkGroup, Service, ServiceStatus } from "../data/mock";
import { statusBadgeBase, statusDotBase, statusStyles } from "../lib/status";
import { createId, defaultData, loadData, saveData, type DashboardData } from "../lib/store";

const root = document.documentElement;
const stored = loadData();
let data: DashboardData = stored ?? defaultData();

// ---------------------------------------------------------------- helpers

function query<T extends Element = HTMLElement>(selector: string, scope: ParentNode = document): T {
  const el = scope.querySelector<T>(selector);
  if (!el) throw new Error(`Astrolinks editor: missing element ${selector}`);
  return el;
}

function cloneTemplate(name: string): HTMLElement {
  const template = query<HTMLTemplateElement>(`template[data-template="${name}"]`);
  return template.content.firstElementChild!.cloneNode(true) as HTMLElement;
}

function setText(scope: ParentNode, field: string, text: string) {
  const el = scope.querySelector(`[data-field="${field}"]`);
  if (el) el.textContent = text;
}

function setLabel(scope: ParentNode, action: string, label: string) {
  const el = scope.querySelector(`[data-action="${action}"]`);
  el?.setAttribute("aria-label", label);
  el?.setAttribute("title", label);
}

function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function announce(message: string) {
  setText(document, "status-message", message);
}

// ---------------------------------------------------------------- render

function renderService(service: Service): HTMLElement {
  const item = cloneTemplate("service");
  item.dataset.id = service.id;
  query<HTMLAnchorElement>("[data-service-link]", item).href = service.url;
  setText(item, "initial", service.name.charAt(0).toUpperCase());
  setText(item, "name", service.name);
  setText(item, "description", service.description);
  setText(item, "host", hostOf(service.url));

  const style = statusStyles[service.status] ?? statusStyles.online;
  query("[data-status]", item).className = `${statusBadgeBase} ${style.text}`;
  query("[data-status-dot]", item).className = `${statusDotBase} ${style.dot}`;
  setText(item, "status-label", style.label);

  setLabel(item, "edit-service", `Edit ${service.name}`);
  setLabel(item, "remove-service", `Remove ${service.name}`);
  return item;
}

function renderBookmark(bookmark: Bookmark): HTMLElement {
  const item = cloneTemplate("bookmark");
  item.dataset.id = bookmark.id;
  query<HTMLAnchorElement>("[data-bookmark-link]", item).href = bookmark.url;
  setText(item, "label", bookmark.label);
  setLabel(item, "edit-bookmark", `Edit ${bookmark.label}`);
  setLabel(item, "remove-bookmark", `Remove ${bookmark.label}`);
  return item;
}

function renderGroup(group: BookmarkGroup): HTMLElement {
  const card = cloneTemplate("bookmark-group");
  card.dataset.groupId = group.id;
  setText(card, "title", group.title);
  setLabel(card, "add-bookmark", `Add bookmark to ${group.title}`);
  query("[data-bookmark-list]", card).replaceChildren(...group.links.map(renderBookmark));
  return card;
}

function render() {
  const list = query("[data-service-list]");
  const addTile = query("[data-add-tile]", list);
  list.replaceChildren(...data.services.map(renderService), addTile);

  query("[data-bookmark-groups]").replaceChildren(...data.bookmarkGroups.map(renderGroup));

  const online = data.services.filter((s) => s.status === "online").length;
  setText(document, "online-count", String(online));
  setText(document, "total-count", String(data.services.length));
  query("#services [data-section-meta]").textContent = `${data.services.length} total`;
  query("#bookmarks [data-section-meta]").textContent = `${data.bookmarkGroups.length} groups`;
}

function commit(message: string, focusSelector?: string) {
  const saved = saveData(data);
  render();
  announce(saved ? message : `${message}. This browser blocked saving, so the change will be lost on reload.`);
  const target = (focusSelector && document.querySelector<HTMLElement>(focusSelector)) || query("[data-action='toggle-edit']");
  target.focus();
}

// ---------------------------------------------------------------- edit mode

function setEditing(on: boolean) {
  root.toggleAttribute("data-editing", on);
  setText(document, "edit-label", on ? "Done" : "Edit");
  announce(on ? "Edit mode on" : "Edit mode off");
}

// ---------------------------------------------------------------- dialogs

const serviceDialog = query<HTMLDialogElement>("#service-dialog");
const bookmarkDialog = query<HTMLDialogElement>("#bookmark-dialog");
const confirmDialog = query<HTMLDialogElement>("#confirm-dialog");
// Work to run once a dialog has closed, so focus moves to the redrawn page
// instead of the (now replaced) button that opened the dialog.
const afterClose = new WeakMap<HTMLDialogElement, () => void>();
let pendingRemoval: (() => void) | null = null;

function openDialog(dialog: HTMLDialogElement) {
  afterClose.delete(dialog);
  dialog.showModal();
}

function formOf(dialog: HTMLDialogElement) {
  return query<HTMLFormElement>("form", dialog);
}

function field(form: HTMLFormElement, name: string) {
  return form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement;
}

function openServiceDialog(service?: Service) {
  const form = formOf(serviceDialog);
  form.reset();
  setText(serviceDialog, "dialog-title", service ? `Edit ${service.name}` : "Add service");
  field(form, "id").value = service?.id ?? "";
  field(form, "name").value = service?.name ?? "";
  field(form, "url").value = service?.url ?? "";
  field(form, "description").value = service?.description ?? "";
  field(form, "status").value = service?.status ?? "online";
  openDialog(serviceDialog);
}

function openBookmarkDialog(groupId: string, bookmark?: Bookmark) {
  const form = formOf(bookmarkDialog);
  form.reset();
  setText(bookmarkDialog, "dialog-title", bookmark ? `Edit ${bookmark.label}` : "Add bookmark");
  const groupSelect = field(form, "groupId") as HTMLSelectElement;
  groupSelect.replaceChildren(...data.bookmarkGroups.map((g) => new Option(g.title, g.id)));
  groupSelect.value = groupId;
  field(form, "id").value = bookmark?.id ?? "";
  field(form, "originalGroupId").value = groupId;
  field(form, "label").value = bookmark?.label ?? "";
  field(form, "url").value = bookmark?.url ?? "";
  openDialog(bookmarkDialog);
}

function confirmRemoval(message: string, onConfirm: () => void) {
  setText(confirmDialog, "confirm-message", message);
  pendingRemoval = onConfirm;
  openDialog(confirmDialog);
}

formOf(serviceDialog).addEventListener("submit", (event) => {
  const form = event.currentTarget as HTMLFormElement;
  const values = Object.fromEntries(new FormData(form)) as Record<string, string>;
  const service: Service = {
    id: values.id || createId(),
    name: values.name.trim(),
    url: values.url.trim(),
    description: values.description.trim(),
    status: values.status as ServiceStatus,
  };
  afterClose.set(serviceDialog, () => {
    const index = data.services.findIndex((s) => s.id === service.id);
    if (index >= 0) data.services[index] = service;
    else data.services.push(service);
    commit(index >= 0 ? `Saved ${service.name}` : `Added ${service.name}`, `[data-id="${service.id}"] [data-action="edit-service"]`);
  });
});

formOf(bookmarkDialog).addEventListener("submit", (event) => {
  const form = event.currentTarget as HTMLFormElement;
  const values = Object.fromEntries(new FormData(form)) as Record<string, string>;
  const bookmark: Bookmark = { id: values.id || createId(), label: values.label.trim(), url: values.url.trim() };
  afterClose.set(bookmarkDialog, () => {
    const original = data.bookmarkGroups.find((g) => g.id === values.originalGroupId);
    const target = data.bookmarkGroups.find((g) => g.id === values.groupId);
    if (!target) return;

    const existing = original?.links.findIndex((l) => l.id === bookmark.id) ?? -1;
    if (original && existing >= 0 && original === target) {
      original.links[existing] = bookmark;
    } else {
      // New bookmark, or one moved to another group.
      if (original && existing >= 0) original.links.splice(existing, 1);
      target.links.push(bookmark);
    }
    commit(existing >= 0 ? `Saved ${bookmark.label}` : `Added ${bookmark.label}`, `[data-id="${bookmark.id}"] [data-action="edit-bookmark"]`);
  });
});

formOf(confirmDialog).addEventListener("submit", () => {
  if (pendingRemoval) afterClose.set(confirmDialog, pendingRemoval);
  pendingRemoval = null;
});

for (const dialog of [serviceDialog, bookmarkDialog, confirmDialog]) {
  // Only a submit (Save / Remove) leaves work queued; Cancel, Esc and a
  // backdrop click close the dialog without changing anything.
  dialog.addEventListener("close", () => {
    const work = afterClose.get(dialog);
    afterClose.delete(dialog);
    work?.();
  });

  // Backdrop click closes the dialog where closedby="any" is not supported yet.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}

// ---------------------------------------------------------------- actions

function findService(id: string | undefined) {
  return data.services.find((s) => s.id === id);
}

function findBookmark(groupId: string | undefined, id: string | undefined) {
  const group = data.bookmarkGroups.find((g) => g.id === groupId);
  return { group, bookmark: group?.links.find((l) => l.id === id) };
}

document.addEventListener("click", (event) => {
  const target = event.target as Element;
  const editing = root.hasAttribute("data-editing");
  const itemId = target.closest<HTMLElement>("li[data-id]")?.dataset.id;
  const groupId = target.closest<HTMLElement>("[data-group-id]")?.dataset.groupId;

  // In edit mode a click on a card or bookmark edits it instead of opening the link.
  if (editing && target.closest("[data-service-link]")) {
    event.preventDefault();
    const service = findService(itemId);
    if (service) openServiceDialog(service);
    return;
  }
  if (editing && target.closest("[data-bookmark-link]")) {
    event.preventDefault();
    const { bookmark } = findBookmark(groupId, itemId);
    if (bookmark && groupId) openBookmarkDialog(groupId, bookmark);
    return;
  }

  const action = target.closest<HTMLElement>("[data-action]")?.dataset.action;
  switch (action) {
    case "toggle-edit":
      setEditing(!editing);
      break;
    case "close-dialog":
      target.closest("dialog")?.close();
      break;
    case "add-service":
      openServiceDialog();
      break;
    case "edit-service": {
      const service = findService(itemId);
      if (service) openServiceDialog(service);
      break;
    }
    case "remove-service": {
      const service = findService(itemId);
      if (!service) break;
      confirmRemoval(`Remove ${service.name} from your services?`, () => {
        data.services = data.services.filter((s) => s.id !== service.id);
        commit(`Removed ${service.name}`, "[data-action='add-service']");
      });
      break;
    }
    case "add-bookmark":
      if (groupId) openBookmarkDialog(groupId);
      break;
    case "edit-bookmark": {
      const { bookmark } = findBookmark(groupId, itemId);
      if (bookmark && groupId) openBookmarkDialog(groupId, bookmark);
      break;
    }
    case "remove-bookmark": {
      const { group, bookmark } = findBookmark(groupId, itemId);
      if (!group || !bookmark) break;
      confirmRemoval(`Remove ${bookmark.label} from ${group.title}?`, () => {
        group.links = group.links.filter((l) => l.id !== bookmark.id);
        commit(`Removed ${bookmark.label}`, `[data-group-id="${group.id}"] [data-action='add-bookmark']`);
      });
      break;
    }
  }
});

// Esc leaves edit mode when no dialog is open (an open dialog handles Esc itself).
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && root.hasAttribute("data-editing") && !document.querySelector("dialog[open]")) {
    setEditing(false);
  }
});

// Saved data replaces the server-rendered defaults.
if (stored) render();
