import { supabase, isConfigured } from "./supabase-client.js";

const gallery = document.querySelector("#gallery");
const searchInput = document.querySelector("#searchInput");
const countEl = document.querySelector("#projectCount");
let allProjects = [];

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function prettyDate(date) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit", month: "short", year: "numeric"
  }).format(new Date(`${date}T00:00:00`));
}

function render(projects) {
  countEl.textContent = `${projects.length} project${projects.length === 1 ? "" : "s"}`;

  if (!projects.length) {
    gallery.innerHTML = '<div class="gallery-message">No published projects found.</div>';
    return;
  }

  gallery.innerHTML = projects.map(project => {
    const media = project.media || [];
    const first = media[0];
    const coverUrl = project.cover_image || first?.media_url || "";
    const coverType = first?.media_url === coverUrl ? first.media_type : "image";
    const cover = coverUrl
      ? coverType === "video"
        ? `<video src="${escapeHtml(coverUrl)}" muted playsinline preload="metadata"></video>`
        : `<img src="${escapeHtml(coverUrl)}" loading="lazy" alt="${escapeHtml(project.title)}">`
      : "";
    const meta = [project.client, project.location, prettyDate(project.event_date)]
      .filter(Boolean).map(escapeHtml).join(" · ");

    return `<article class="project-card">
      <div class="project-cover">
        ${cover}
        <span class="media-count">${media.length} media</span>
      </div>
      <div class="project-info">
        ${meta ? `<div class="project-meta">${meta}</div>` : ""}
        <h2>${escapeHtml(project.title)}</h2>
        ${project.description ? `<p>${escapeHtml(project.description)}</p>` : ""}
      </div>
    </article>`;
  }).join("");
}

async function loadProjects() {
  if (!isConfigured()) {
    gallery.innerHTML = '<div class="gallery-message"><strong>Gallery setup pending.</strong><br>Add the Supabase URL and publishable key in assets/js/config.js.</div>';
    countEl.textContent = "";
    return;
  }

  const { data, error } = await supabase
    .from("projects")
    .select(`
      id,title,client,location,event_date,description,cover_image,published,created_at,
      media(id,media_url,media_type,sort_order,created_at)
    `)
    .eq("published", true)
    .order("event_date", { ascending: false, nullsFirst: false });

  if (error) {
    console.error(error);
    gallery.innerHTML = '<div class="gallery-message">Unable to load the gallery right now.</div>';
    return;
  }

  allProjects = (data || []).map(project => ({
    ...project,
    media: [...(project.media || [])].sort((a, b) => a.sort_order - b.sort_order)
  }));
  render(allProjects);
}

searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) return render(allProjects);
  render(allProjects.filter(project =>
    [project.title, project.client, project.location, project.description]
      .filter(Boolean)
      .some(value => value.toLowerCase().includes(query))
  ));
});

loadProjects();
