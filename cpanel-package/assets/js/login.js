import { supabase, isConfigured } from "./supabase-client.js";

const form = document.querySelector("#loginForm");
const email = document.querySelector("#email");
const password = document.querySelector("#password");
const btn = document.querySelector("#loginBtn");
const msg = document.querySelector("#message");

function showMessage(text, type = "error") {
  msg.textContent = text;
  msg.className = `msg show ${type}`;
}

async function init() {
  if (!isConfigured()) {
    showMessage("Add your Supabase URL and public key in assets/js/config.js first.");
    btn.disabled = true;
    return;
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (session) location.href = "/admin/dashboard";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  msg.className = "msg";
  btn.disabled = true;
  btn.textContent = "Signing in…";

  const { error } = await supabase.auth.signInWithPassword({
    email: email.value.trim(),
    password: password.value
  });

  btn.disabled = false;
  btn.textContent = "Login to Dashboard";

  if (error) {
    showMessage(error.message || "Login failed.");
    return;
  }
  location.href = "/admin/dashboard";
});

init();
