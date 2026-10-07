import { supabase, isConfigured } from "./supabase-client.js";

function currentPage() {
  const path = location.pathname.replace(/\/$/, "") || "/";
  return path.endsWith(".html")
    ? (path === "/index.html" ? "/" : path.slice(0, -5))
    : path;
}

async function applySavedContent() {
  if (!isConfigured()) return;
  const { data, error } = await supabase
    .from("site_content")
    .select("changes")
    .eq("page_path", currentPage())
    .maybeSingle();

  // The CMS table may not have been installed yet; keep the website usable.
  if (error || !data?.changes) return;
  for (const change of data.changes) {
    try {
      const element = document.querySelector(change.selector);
      if (!element) continue;
      if (change.type === "image" && element.tagName === "IMG") {
        element.src = change.value;
        if (typeof change.alt === "string") element.alt = change.alt;
      } else if (change.type === "text") {
        element.innerHTML = change.value;
      }
    } catch (error) {
      console.warn("WESTERS CMS: skipped invalid content selector", change.selector);
    }
  }
}

applySavedContent();
