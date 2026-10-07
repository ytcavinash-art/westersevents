let token = sessionStorage.getItem("westers_admin_token") || "";
let allLeads = [];

document.querySelector("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  if (!res.ok) return alert(json.message || "Login failed");
  token = json.token;
  sessionStorage.setItem("westers_admin_token", token);
  loadDashboard();
});

async function loadDashboard() {
  const res = await fetch("/api/admin/enquiries", {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (res.status === 401) {
    sessionStorage.removeItem("westers_admin_token");
    token = "";
    document.querySelector("#loginCard").classList.remove("hidden");
    document.querySelector("#dashboard").classList.add("hidden");
    return;
  }
  const data = await res.json();
  allLeads = data.enquiries || [];

  document.querySelector("#loginCard").classList.add("hidden");
  document.querySelector("#dashboard").classList.remove("hidden");

  renderMetrics(allLeads);
  renderTable();
}

function renderMetrics(leads) {
  const counts = {
    Total: leads.length,
    Verified: leads.filter(x => x.verified).length,
    Quotation: leads.filter(x => x.status === "QUOTATION").length,
    Confirmed: leads.filter(x => x.status === "CONFIRMED").length
  };
  document.querySelector("#metrics").innerHTML = Object.entries(counts)
    .map(([k, v]) => `<div class="metric"><span>${k}</span><strong>${v}</strong></div>`)
    .join("");
}

function renderTable() {
  const query = (document.querySelector("#searchInput")?.value || "").toLowerCase().trim();
  const statusFilter = document.querySelector("#statusFilter")?.value || "";

  const filtered = allLeads.filter(x => {
    const matchesSearch = !query || [
      x.request_id, x.name, x.email, x.phone, x.company, x.event_type, x.location, x.details
    ].some(val => String(val || "").toLowerCase().includes(query));

    const matchesStatus = !statusFilter || x.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  document.querySelector("#leadRows").innerHTML = filtered.map(x => `
    <tr>
      <td><strong>${esc(x.request_id)}</strong></td>
      <td>${esc(x.name)}<br><small style="color:#716d7d">${esc(x.email)}</small>${x.company ? `<br><small style="color:#352D5C">🏢 ${esc(x.company)}</small>` : ''}</td>
      <td>
        <strong>${esc(x.event_type)}</strong>
        ${x.venue_type ? `<br><small style="color:#7b4dff">📍 ${esc(x.venue_type)}</small>` : ''}
        <br><small style="color:#716d7d">${esc(x.location || "Location TBD")} • ${esc(x.guests || 0)} guests</small>
        <details style="margin-top:4px"><summary style="cursor:pointer;color:#7b4dff;font-size:11px">Requirement Notes</summary><p style="margin:4px 0;font-size:12px">${esc(x.details || "No extra details provided.")}</p></details>
      </td>
      <td>${esc(x.event_date || "—")}</td>
      <td><a href="tel:${esc(x.phone)}" style="color:#231f3d;text-decoration:none">${esc(x.phone)}</a></td>
      <td>${esc(x.budget || "—")}</td>
      <td>
        <select onchange="updateStatus('${esc(x.request_id)}', this.value)" style="padding:6px;font-size:12px">
          ${["NEW","VERIFIED","CONTACTED","MEETING","QUOTATION","NEGOTIATION","APPROVED","ADVANCE_PAID","CONFIRMED","COMPLETED","CANCELLED"]
            .map(s => `<option ${s === x.status ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </td>
      <td>
        ${(x.deliveries || []).map(d => `<span class="status">${esc(d.channel)}: ${esc(d.status)}</span>`).join("<br>") || "<small>Awaiting verification</small>"}
        <br><button type="button" class="secondary" style="font-size:10px;padding:4px 8px;margin-top:4px" onclick="retryDelivery('${esc(x.request_id)}')">Retry Delivery</button>
      </td>
      <td>
        <textarea id="notes-${esc(x.request_id)}" rows="2" style="width:140px;font-size:11px;padding:6px;" placeholder="Add internal notes...">${esc(x.admin_notes || "")}</textarea>
        <button type="button" class="secondary" style="font-size:10px;padding:4px 8px;display:block;margin-top:4px" onclick="saveNotes('${esc(x.request_id)}')">Save Note</button>
      </td>
      <td><small style="color:#716d7d">${new Date(x.created_at).toLocaleString()}</small></td>
    </tr>
  `).join("");
}

async function updateStatus(id, status) {
  const res = await fetch(`/api/admin/enquiries/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status })
  });
  if (!res.ok) {
    const result = await res.json();
    alert(result.message || "Could not update status");
  }
  await loadDashboard();
}

async function saveNotes(id) {
  const notes = document.querySelector(`#notes-${CSS.escape(id)}`)?.value || "";
  try {
    const res = await fetch(`/api/admin/enquiries/${encodeURIComponent(id)}/notes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ notes })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "Failed to save notes");
    alert("Internal note saved!");
    await loadDashboard();
  } catch (err) {
    alert(err.message);
  }
}

async function exportCSV() {
  try {
    const res = await fetch("/api/admin/enquiries/export", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Unable to download CSV.");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `westers-leads-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) {
    alert(err.message);
  }
}

function esc(v = "") {
  return String(v).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

window.updateStatus = updateStatus;
window.saveNotes = saveNotes;
window.retryDelivery = retryDelivery;

if (token) loadDashboard().catch(() => alert("Unable to load dashboard."));

document.querySelector("#searchInput")?.addEventListener("input", renderTable);
document.querySelector("#statusFilter")?.addEventListener("change", renderTable);
document.querySelector("#exportCsvBtn")?.addEventListener("click", exportCSV);
document.querySelector("#refreshLeads").onclick = () => loadDashboard().catch(() => alert("Unable to refresh leads."));
document.querySelector("#logout").onclick = () => { sessionStorage.removeItem("westers_admin_token"); location.reload(); };

async function retryDelivery(id) {
  try {
    const res = await fetch('/api/admin/enquiries/' + encodeURIComponent(id) + '/retry', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!res.ok) throw Error('Unable to queue delivery.');
    await loadDashboard();
  } catch (error) { alert(error.message); }
}
