import { supabase, CONFIG, isConfigured } from "./supabase-client.js";

const $ = (s) => document.querySelector(s);
const els = {
  logoutBtn: $("#logoutBtn"), userEmail: $("#userEmail"),
  sidebarEmail: $("#sidebarEmail"), globalAdminSearch: $("#globalAdminSearch"),
  totalProjects: $("#totalProjects"), totalImages: $("#totalImages"), totalVideos: $("#totalVideos"),
  newProjectBtn: $("#newProjectBtn"), projectsList: $("#projectsList"), searchProjects: $("#searchProjects"),
  modal: $("#projectModal"), closeModalBtn: $("#closeModalBtn"), cancelBtn: $("#cancelBtn"),
  form: $("#projectForm"), modalTitle: $("#modalTitle"), projectId: $("#projectId"),
  title: $("#title"), client: $("#client"), location: $("#location"), eventDate: $("#eventDate"),
  description: $("#description"), published: $("#published"), mediaFiles: $("#mediaFiles"),
  mediaGrid: $("#mediaGrid"), saveBtn: $("#saveBtn"),
  progressWrap: $("#progressWrap"), progressBar: $("#progressBar"), progressText: $("#progressText"),
  toast: $("#toast")
};

let projects = [];
let currentMedia = [];

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  setTimeout(() => els.toast.classList.remove("show"), 2200);
}

function prettyDate(date) {
  if (!date) return "No date";
  return new Intl.DateTimeFormat("en-IN", { day:"2-digit", month:"short", year:"numeric" })
    .format(new Date(`${date}T00:00:00`));
}

async function requireAuth() {
  if (!isConfigured()) {
    alert("Add Supabase credentials in assets/js/config.js first.");
    location.href = "/admin";
    return null;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    location.href = "/admin";
    return null;
  }
  els.userEmail.textContent = session.user.email || "";
  if (els.sidebarEmail) els.sidebarEmail.textContent = session.user.email || "";
  return session;
}

function renderStats() {
  els.totalProjects.textContent = projects.length;
  const allMedia = projects.flatMap(p => p.media || []);
  els.totalImages.textContent = allMedia.filter(m => m.media_type === "image").length;
  els.totalVideos.textContent = allMedia.filter(m => m.media_type === "video").length;
}

function projectThumb(p) {
  const media = p.media || [];
  const first = media.find(m => m.media_url === p.cover_image) || media[0];
  const url = p.cover_image || first?.media_url;
  if (!url) return "";
  const type = first?.media_url === url ? first.media_type : "image";
  return type === "video"
    ? `<video src="${escapeHtml(url)}" muted preload="metadata"></video>`
    : `<img src="${escapeHtml(url)}" alt="">`;
}

function renderProjects(list = projects) {
  if (!list.length) {
    els.projectsList.innerHTML = `<div class="empty">No projects yet. Click “Add New Project”.</div>`;
    return;
  }

  els.projectsList.innerHTML = list.map(p => `
    <div class="project-row">
      <div class="thumb">${projectThumb(p)}</div>
      <div>
        <div class="p-title">${escapeHtml(p.title)}</div>
        <div class="p-sub">${escapeHtml(p.location || "No location")} • ${prettyDate(p.event_date)} • ${(p.media || []).length} media</div>
      </div>
      <div class="client-col">
        <div class="p-title">${escapeHtml(p.client || "—")}</div>
        <div class="p-sub">Client</div>
      </div>
      <div class="status-col">
        <span class="status ${p.published ? "live" : "draft"}">${p.published ? "Published" : "Draft"}</span>
      </div>
      <div class="row-actions">
        <button class="icon-btn" data-action="toggle" data-id="${p.id}">${p.published ? "Unpublish" : "Publish"}</button>
        <button class="icon-btn" data-action="edit" data-id="${p.id}">Edit</button>
        <button class="icon-btn delete" data-action="delete" data-id="${p.id}">Delete</button>
      </div>
    </div>
  `).join("");
}

async function loadProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select(`
      id,title,client,location,event_date,description,cover_image,published,created_at,updated_at,
      media(id,project_id,media_url,storage_path,media_type,file_name,sort_order,created_at)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    els.projectsList.innerHTML = `<div class="empty">Could not load projects: ${escapeHtml(error.message)}</div>`;
    return;
  }

  projects = (data || []).map(p => ({
    ...p,
    media: [...(p.media || [])].sort((a,b) => a.sort_order - b.sort_order)
  }));
  renderStats();
  renderProjects();
}

function openModal(project = null) {
  els.form.reset();
  els.projectId.value = project?.id || "";
  els.modalTitle.textContent = project ? "Edit Project" : "Add Project";
  els.title.value = project?.title || "";
  els.client.value = project?.client || "";
  els.location.value = project?.location || "";
  els.eventDate.value = project?.event_date || "";
  els.description.value = project?.description || "";
  els.published.checked = Boolean(project?.published);
  els.mediaFiles.value = "";
  currentMedia = project ? [...(project.media || [])] : [];
  renderCurrentMedia(project?.cover_image || "");
  els.progressWrap.classList.remove("show");
  els.progressBar.style.width = "0";
  els.modal.classList.add("open");
  els.modal.setAttribute("aria-hidden", "false");
  setTimeout(() => els.title.focus(), 30);
}

function closeModal() {
  els.modal.classList.remove("open");
  els.modal.setAttribute("aria-hidden", "true");
}

function renderCurrentMedia(coverImage = "") {
  if (!currentMedia.length) {
    els.mediaGrid.innerHTML = "";
    return;
  }

  const project = projects.find(p => p.id === els.projectId.value);
  const cover = coverImage || project?.cover_image || "";

  els.mediaGrid.innerHTML = currentMedia.map(m => `
    <div class="media-item">
      ${m.media_type === "video"
        ? `<video src="${escapeHtml(m.media_url)}" muted preload="metadata"></video>`
        : `<img src="${escapeHtml(m.media_url)}" alt="">`}
      ${m.media_url === cover ? `<span class="cover-badge">COVER</span>` : ""}
      <div class="media-actions">
        ${m.media_type === "image" ? `<button type="button" data-media-action="cover" data-media-id="${m.id}">Set cover</button>` : ""}
        <button class="remove" type="button" data-media-action="remove" data-media-id="${m.id}">Delete</button>
      </div>
    </div>
  `).join("");
}

function sanitizeFileName(name) {
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot).toLowerCase().replace(/[^a-z0-9.]/g, "") : "";
  const base = (dot >= 0 ? name.slice(0, dot) : name)
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  return `${base || "media"}${ext}`;
}

function getMediaType(file) {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return null;
}

async function uploadSelectedFiles(projectId) {
  const files = [...els.mediaFiles.files];
  if (!files.length) return [];

  const uploaded = [];
  els.progressWrap.classList.add("show");

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const mediaType = getMediaType(file);
    if (!mediaType) throw new Error(`Unsupported file: ${file.name}`);

    const safeName = sanitizeFileName(file.name);
    const storagePath = `${projectId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

    els.progressText.textContent = `Uploading ${i + 1}/${files.length}: ${file.name}`;
    els.progressBar.style.width = `${Math.round((i / files.length) * 100)}%`;

    const { error: uploadError } = await supabase.storage
      .from(CONFIG.STORAGE_BUCKET)
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined
      });

    if (uploadError) throw uploadError;

    const { data: publicData } = supabase.storage
      .from(CONFIG.STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    const row = {
      project_id: projectId,
      media_url: publicData.publicUrl,
      storage_path: storagePath,
      media_type: mediaType,
      file_name: file.name,
      sort_order: currentMedia.length + uploaded.length
    };

    const { data: inserted, error: dbError } = await supabase
      .from("media")
      .insert(row)
      .select()
      .single();

    if (dbError) {
      await supabase.storage.from(CONFIG.STORAGE_BUCKET).remove([storagePath]);
      throw dbError;
    }

    uploaded.push(inserted);
    els.progressBar.style.width = `${Math.round(((i + 1) / files.length) * 100)}%`;
  }

  els.progressText.textContent = "Upload complete";
  return uploaded;
}

async function saveProject(event) {
  event.preventDefault();
  els.saveBtn.disabled = true;
  els.saveBtn.textContent = "Saving…";

  try {
    const payload = {
      title: els.title.value.trim(),
      client: els.client.value.trim() || null,
      location: els.location.value.trim() || null,
      event_date: els.eventDate.value || null,
      description: els.description.value.trim() || null,
      published: els.published.checked
    };

    if (!payload.title) throw new Error("Project name is required.");

    let projectId = els.projectId.value;
    let project;

    if (projectId) {
      const { data, error } = await supabase
        .from("projects")
        .update(payload)
        .eq("id", projectId)
        .select()
        .single();
      if (error) throw error;
      project = data;
    } else {
      const { data, error } = await supabase
        .from("projects")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      project = data;
      projectId = data.id;
      els.projectId.value = projectId;
    }

    const uploaded = await uploadSelectedFiles(projectId);

    // Automatically use first uploaded image as cover if no cover exists.
    const oldProject = projects.find(p => p.id === projectId);
    const currentCover = oldProject?.cover_image || project.cover_image;
    const firstImage = [...currentMedia, ...uploaded].find(m => m.media_type === "image");

    if (!currentCover && firstImage) {
      const { error } = await supabase
        .from("projects")
        .update({ cover_image: firstImage.media_url })
        .eq("id", projectId);
      if (error) throw error;
    }

    toast("Project saved successfully");
    closeModal();
    await loadProjects();
  } catch (error) {
    console.error(error);
    alert(error.message || "Something went wrong.");
  } finally {
    els.saveBtn.disabled = false;
    els.saveBtn.textContent = "Save Project";
  }
}

async function deleteProject(id) {
  const project = projects.find(p => p.id === id);
  if (!project) return;
  if (!confirm(`Delete "${project.title}" and all its media? This cannot be undone.`)) return;

  const paths = (project.media || []).map(m => m.storage_path).filter(Boolean);
  if (paths.length) {
    const { error: storageError } = await supabase.storage.from(CONFIG.STORAGE_BUCKET).remove(paths);
    if (storageError) {
      console.error(storageError);
      if (!confirm("Some storage files could not be removed. Delete database project anyway?")) return;
    }
  }

  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) return alert(error.message);

  toast("Project deleted");
  await loadProjects();
}

async function togglePublished(id) {
  const project = projects.find(p => p.id === id);
  if (!project) return;

  const { error } = await supabase
    .from("projects")
    .update({ published: !project.published })
    .eq("id", id);

  if (error) return alert(error.message);
  toast(project.published ? "Project unpublished" : "Project published");
  await loadProjects();
}

async function deleteMedia(mediaId) {
  const media = currentMedia.find(m => m.id === mediaId);
  if (!media) return;
  if (!confirm(`Delete "${media.file_name || "this media"}"?`)) return;

  const { error: storageError } = await supabase.storage
    .from(CONFIG.STORAGE_BUCKET)
    .remove([media.storage_path]);

  if (storageError) return alert(storageError.message);

  const { error: dbError } = await supabase.from("media").delete().eq("id", mediaId);
  if (dbError) return alert(dbError.message);

  const project = projects.find(p => p.id === els.projectId.value);
  if (project?.cover_image === media.media_url) {
    const remaining = currentMedia.filter(m => m.id !== mediaId);
    const newCover = remaining.find(m => m.media_type === "image")?.media_url || null;
    await supabase.from("projects").update({ cover_image: newCover }).eq("id", project.id);
    project.cover_image = newCover;
  }

  currentMedia = currentMedia.filter(m => m.id !== mediaId);
  renderCurrentMedia(project?.cover_image || "");
  toast("Media deleted");
}

async function setCover(mediaId) {
  const media = currentMedia.find(m => m.id === mediaId);
  if (!media || media.media_type !== "image") return;

  const projectId = els.projectId.value;
  const { error } = await supabase
    .from("projects")
    .update({ cover_image: media.media_url })
    .eq("id", projectId);

  if (error) return alert(error.message);

  const project = projects.find(p => p.id === projectId);
  if (project) project.cover_image = media.media_url;
  renderCurrentMedia(media.media_url);
  toast("Cover image updated");
}

els.newProjectBtn.addEventListener("click", () => openModal());
document.querySelector(".sidebar-new-project")?.addEventListener("click", () => openModal());
document.querySelector("#mobileSidebarBtn")?.addEventListener("click", () => document.body.classList.toggle("sidebar-open"));
els.closeModalBtn.addEventListener("click", closeModal);
els.cancelBtn.addEventListener("click", closeModal);
els.form.addEventListener("submit", saveProject);

els.modal.addEventListener("click", (e) => {
  if (e.target === els.modal) closeModal();
});

els.logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  location.href = "/admin";
});

els.searchProjects.addEventListener("input", () => {
  const q = els.searchProjects.value.trim().toLowerCase();
  if (!q) return renderProjects(projects);
  renderProjects(projects.filter(p =>
    [p.title,p.client,p.location,p.description].filter(Boolean).some(v => v.toLowerCase().includes(q))
  ));
});

els.globalAdminSearch?.addEventListener("input", () => {
  els.searchProjects.value = els.globalAdminSearch.value;
  els.searchProjects.dispatchEvent(new Event("input"));
});

els.projectsList.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const { action, id } = btn.dataset;

  if (action === "edit") openModal(projects.find(p => p.id === id));
  if (action === "delete") await deleteProject(id);
  if (action === "toggle") await togglePublished(id);
});

els.mediaGrid.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-media-action]");
  if (!btn) return;
  if (btn.dataset.mediaAction === "remove") await deleteMedia(btn.dataset.mediaId);
  if (btn.dataset.mediaAction === "cover") await setCover(btn.dataset.mediaId);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && els.modal.classList.contains("open")) closeModal();
});

const session = await requireAuth();
if (session) await loadProjects();
