import { supabase, CONFIG } from "./supabase-client.js";

const pages = [
  ["/", "Home", "home"], ["/", "Contact Details", "#contact"], ["/about", "About"], ["/services", "Services"],
  ["/work", "Our Work"], ["/gallery", "Gallery"], ["/videos", "Videos"],
  ["/clients", "Clients"], ["/service-event-management", "Event Management"],
  ["/service-corporate-events", "Corporate Events"], ["/service-brand-activations", "Brand Activations"],
  ["/service-advertising", "Advertising"], ["/service-media-production", "Media Production"],
  ["/service-exhibitions-launches", "Exhibitions & Launches"]
];

const $ = selector => document.querySelector(selector);
const mediaDashboard = $("#mediaDashboard");
const websiteEditor = $("#websiteEditor");
const pageSelect = $("#cmsPageSelect");
const fields = $("#cmsFields");
const loading = $("#editorLoading");
const title = $("#cmsPageTitle");
const pathLabel = $("#cmsPagePath");
const openPage = $("#cmsOpenPage");
const saveBtn = $("#savePageBtn");
const undoBtn = $("#undoEditorBtn");
const resetBtn = $("#resetPageBtn");
const toastEl = $("#toast");

let activePage = pages[0];
let originalChanges = new Map();
let draftChanges = new Map();
let undoStack = [];

pageSelect.innerHTML = pages.map(([, label], index) => `<option value="${index}">${label}</option>`).join("");

function toast(message) {
  toastEl.textContent = message; toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 2500);
}

function esc(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function cssEscape(value) {
  return window.CSS?.escape ? CSS.escape(value) : value.replace(/([^a-zA-Z0-9_-])/g, "\\$1");
}

function selectorFor(element, doc) {
  if (element.id) return `#${cssEscape(element.id)}`;
  const parts = [];
  let node = element;
  while (node && node !== doc.body) {
    let part = node.tagName.toLowerCase();
    const same = [...node.parentElement.children].filter(child => child.tagName === node.tagName);
    if (same.length > 1) part += `:nth-of-type(${same.indexOf(node) + 1})`;
    parts.unshift(part); node = node.parentElement;
  }
  return `body > ${parts.join(" > ")}`;
}

function sectionName(element) {
  const section = element.closest("section,header,footer,main");
  if (!section) return "General Content";
  if (section.id) return section.id.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const className = [...section.classList].find(name => !["section", "page-content"].includes(name));
  return className ? className.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : section.tagName.toLowerCase();
}

function fieldLabel(element, index) {
  const tag = element.tagName.toLowerCase();
  if (/^h[1-6]$/.test(tag)) return `Heading ${index + 1}`;
  if (tag === "img") return `Image ${index + 1}`;
  if (tag === "a" || tag === "button") return `Button / Link ${index + 1}`;
  if (element.classList.contains("section-label")) return `Section Label ${index + 1}`;
  return `Text ${index + 1}`;
}

function applyChanges(doc, changes) {
  changes.forEach(change => {
    try {
      const element = doc.querySelector(change.selector);
      if (!element) return;
      if (change.type === "image") { element.src = change.value; element.alt = change.alt || element.alt; }
      else element.innerHTML = change.value;
    } catch {}
  });
}

function renderFields(doc) {
  const candidates = [...doc.querySelectorAll("h1,h2,h3,h4,h5,h6,p,a,button,.section-label,.featured-tag,.service-more,img")]
    .filter(element => !element.closest("script,style,form") && (element.tagName === "IMG" || !element.querySelector("img,video")))
    .filter(element => activePage[2] === "#contact" ? Boolean(element.closest("#contact")) : activePage[2] === "home" ? !element.closest("#contact") : true);
  const groups = new Map();
  candidates.forEach((element, index) => {
    const group = sectionName(element);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push({ element, index, selector: selectorFor(element, doc) });
  });

  fields.innerHTML = [...groups].map(([group, items]) => `<section class="cms-section"><h3>${esc(group)}</h3>${items.map(({ element, index, selector }) => {
    const label = fieldLabel(element, index);
    if (element.tagName === "IMG") return `<div class="cms-field" data-selector="${esc(selector)}" data-type="image"><label>${esc(label)}</label><div class="cms-image-row"><img src="${esc(element.src)}" alt=""><div><div class="cms-image-actions"><button class="btn btn-secondary cms-replace-image" type="button">Replace Image</button><input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"></div><input class="cms-alt" value="${esc(element.alt)}" placeholder="Image description"></div></div></div>`;
    const value = element.innerHTML;
    const control = value.length > 90 || element.tagName === "P"
      ? `<textarea class="cms-value">${esc(value)}</textarea>`
      : `<input class="cms-value" value="${esc(value)}">`;
    return `<div class="cms-field" data-selector="${esc(selector)}" data-type="text"><label>${esc(label)}</label>${control}</div>`;
  }).join("")}</section>`).join("");

  fields.querySelectorAll(".cms-value,.cms-alt").forEach(input => input.addEventListener("focus", () => input.dataset.before = input.value));
  fields.querySelectorAll(".cms-value").forEach(input => input.addEventListener("input", () => updateTextField(input)));
  fields.querySelectorAll(".cms-alt").forEach(input => input.addEventListener("input", () => updateAltField(input)));
  fields.querySelectorAll(".cms-replace-image").forEach(button => button.addEventListener("click", () => button.nextElementSibling.click()));
  fields.querySelectorAll('input[type="file"]').forEach(input => input.addEventListener("change", () => replaceImage(input)));
  loading.classList.add("hide");
}

function remember(selector, previous) {
  if (undoStack.at(-1)?.selector !== selector) undoStack.push({ selector, previous });
  undoBtn.disabled = false;
}

function updateTextField(input) {
  const row = input.closest(".cms-field"); const selector = row.dataset.selector;
  remember(selector, input.dataset.before ?? input.value);
  draftChanges.set(selector, { selector, type: "text", value: input.value });
}

function updateAltField(input) {
  const row = input.closest(".cms-field"); const selector = row.dataset.selector;
  const existing = draftChanges.get(selector) || originalChanges.get(selector) || { selector, type: "image", value: row.querySelector("img").src };
  remember(selector, input.dataset.before ?? input.value);
  draftChanges.set(selector, { ...existing, alt: input.value });
}

async function replaceImage(input) {
  const file = input.files?.[0]; if (!file) return;
  const row = input.closest(".cms-field"); const preview = row.querySelector("img");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `cms/${activePage[0].replace(/\W+/g, "-") || "home"}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from(CONFIG.STORAGE_BUCKET).upload(storagePath, file);
  if (error) { toast(error.message); return; }
  const { data } = supabase.storage.from(CONFIG.STORAGE_BUCKET).getPublicUrl(storagePath);
  remember(row.dataset.selector, preview.src); preview.src = data.publicUrl;
  draftChanges.set(row.dataset.selector, { selector: row.dataset.selector, type: "image", value: data.publicUrl, alt: row.querySelector(".cms-alt").value });
}

async function loadPage(page) {
  activePage = page; loading.classList.remove("hide"); fields.innerHTML = "";
  title.textContent = page[1]; pathLabel.textContent = page[0]; openPage.href = page[0];
  draftChanges.clear(); undoStack = []; undoBtn.disabled = true;
  const [{ data }, response] = await Promise.all([
    supabase.from("site_content").select("changes").eq("page_path", page[0]).maybeSingle(),
    fetch(`${page[0]}?cmsForm=${Date.now()}`)
  ]);
  const doc = new DOMParser().parseFromString(await response.text(), "text/html");
  originalChanges = new Map((data?.changes || []).map(change => [change.selector, change]));
  applyChanges(doc, originalChanges); renderFields(doc);
}

pageSelect.addEventListener("change", () => loadPage(pages[Number(pageSelect.value)]));

function showEditor() {
  mediaDashboard.hidden = true; websiteEditor.hidden = false;
  document.querySelectorAll(".sidebar-link").forEach(link => link.classList.remove("active"));
  $("#websiteEditorBtn").classList.add("active"); document.body.classList.remove("sidebar-open");
  document.querySelectorAll(".top-view-tab").forEach(tab => tab.classList.remove("active"));
  $("#topWebsiteContentBtn")?.classList.add("active");
  if (!fields.children.length) loadPage(activePage);
}
function showDashboard() {
  websiteEditor.hidden = true; mediaDashboard.hidden = false;
  document.querySelectorAll(".sidebar-link").forEach(link => link.classList.remove("active"));
  $("#sidebarMediaDashboardBtn").classList.add("active"); document.body.classList.remove("sidebar-open");
  document.querySelectorAll(".top-view-tab").forEach(tab => tab.classList.remove("active"));
  document.querySelector(".top-view-tab")?.classList.add("active");
}
$("#websiteEditorBtn").addEventListener("click", showEditor);
$("#topWebsiteContentBtn")?.addEventListener("click", showEditor);
$("#sidebarMediaDashboardBtn").addEventListener("click", showDashboard);
$("#mediaDashboardBtn").addEventListener("click", showDashboard);

saveBtn.addEventListener("click", async () => {
  saveBtn.disabled = true; saveBtn.textContent = "Saving…";
  const merged = new Map(originalChanges); draftChanges.forEach((value, key) => merged.set(key, value));
  const { error } = await supabase.from("site_content").upsert({ page_path: activePage[0], changes: [...merged.values()], updated_at: new Date().toISOString() });
  saveBtn.disabled = false; saveBtn.textContent = "Save Changes";
  if (error) { toast(error.message.includes("site_content") ? "Please run updated supabase/setup.sql first." : error.message); return; }
  originalChanges = merged; draftChanges.clear(); undoStack = []; undoBtn.disabled = true; toast(`${activePage[1]} page updated.`);
});

undoBtn.addEventListener("click", () => {
  const item = undoStack.pop(); if (!item) return;
  const row = [...fields.querySelectorAll(".cms-field")].find(field => field.dataset.selector === item.selector);
  if (row?.dataset.type === "image") row.querySelector("img").src = item.previous;
  else if (row) row.querySelector(".cms-value").value = item.previous;
  if (originalChanges.has(item.selector)) draftChanges.set(item.selector, originalChanges.get(item.selector)); else draftChanges.delete(item.selector);
  undoBtn.disabled = undoStack.length === 0;
});

resetBtn.addEventListener("click", async () => {
  if (!confirm(`Reset all ${activePage[1]} page changes?`)) return;
  const visibleSelectors = new Set([...fields.querySelectorAll(".cms-field")].map(field => field.dataset.selector));
  const remaining = [...originalChanges.values()].filter(change => !visibleSelectors.has(change.selector));
  const query = remaining.length
    ? supabase.from("site_content").upsert({ page_path: activePage[0], changes: remaining, updated_at: new Date().toISOString() })
    : supabase.from("site_content").delete().eq("page_path", activePage[0]);
  const { error } = await query;
  if (error) { toast(error.message); return; }
  toast(`${activePage[1]} restored.`); loadPage(activePage);
});
