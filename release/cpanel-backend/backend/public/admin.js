let token = sessionStorage.getItem("westers_admin_token") || "";

document.querySelector("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  const res = await fetch("/api/admin/login", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(body)
  });
  const json = await res.json();
  if (!res.ok) return alert(json.message || "Login failed");
  token = json.token;
  sessionStorage.setItem("westers_admin_token", token);
  loadDashboard();
});

async function loadDashboard(){
  const res = await fetch("/api/admin/enquiries", {
    headers:{Authorization:`Bearer ${token}`}
  });
  if (res.status === 401) {
    sessionStorage.removeItem("westers_admin_token");
    token = "";
    document.querySelector("#loginCard").classList.remove("hidden");
    document.querySelector("#dashboard").classList.add("hidden");
    return;
  }
  const { enquiries } = await res.json();
  document.querySelector("#loginCard").classList.add("hidden");
  document.querySelector("#dashboard").classList.remove("hidden");

  const counts = {
    Total: enquiries.length,
    Verified: enquiries.filter(x=>x.verified).length,
    Quotation: enquiries.filter(x=>x.status==="QUOTATION").length,
    Confirmed: enquiries.filter(x=>x.status==="CONFIRMED").length
  };
  document.querySelector("#metrics").innerHTML = Object.entries(counts)
    .map(([k,v])=>`<div class="metric"><span>${k}</span><strong>${v}</strong></div>`).join("");

  document.querySelector("#leadRows").innerHTML = enquiries.map(x=>`
    <tr>
      <td><strong>${esc(x.request_id)}</strong></td>
      <td>${esc(x.name)}<br><small>${esc(x.email)}</small></td>
      <td>${esc(x.event_type)}<br><small>${esc(x.location || "")} ? ${esc(x.guests || "")} guests</small><details><summary>Requirement</summary>${esc(x.details || "No details")}</details></td>
      <td>${esc(x.event_date || "—")}</td>
      <td>${esc(x.phone)}</td>
      <td>${esc(x.budget || "—")}</td>
      <td>
        <select onchange="updateStatus('${esc(x.request_id)}',this.value)">
          ${["NEW","VERIFIED","CONTACTED","MEETING","QUOTATION","NEGOTIATION","APPROVED","ADVANCE_PAID","CONFIRMED","COMPLETED","CANCELLED"]
            .map(s=>`<option ${s===x.status?"selected":""}>${s}</option>`).join("")}
        </select>
      </td>
      <td>${(x.deliveries || []).map(d => esc(d.channel) + ": " + esc(d.status)).join("<br>") || "Awaiting verification"}<br><button type="button" onclick="retryDelivery('${esc(x.request_id)}')">Retry failed delivery</button></td><td>${new Date(x.created_at).toLocaleString()}</td>
    </tr>
  `).join("");
}

async function updateStatus(id,status){
  const res = await fetch(`/api/admin/enquiries/${encodeURIComponent(id)}/status`,{
    method:"PATCH",
    headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
    body:JSON.stringify({status})
  });
  if(!res.ok) { const result = await res.json(); alert(result.message || "Could not update status"); }
  await loadDashboard();
}

function esc(v=""){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}

if(token) loadDashboard().catch(() => alert("Unable to load dashboard."));
document.querySelector("#refreshLeads").onclick = () => loadDashboard().catch(() => alert("Unable to refresh leads."));
document.querySelector("#logout").onclick = () => { sessionStorage.removeItem("westers_admin_token"); location.reload(); };

async function retryDelivery(id) {
  try {
    const res = await fetch('/api/admin/enquiries/'+encodeURIComponent(id)+'/retry',{method:'POST',headers:{Authorization:'Bearer '+token}});
    if(!res.ok) throw Error('Unable to queue delivery.');
    await loadDashboard();
  } catch(error) { alert(error.message); }
}
