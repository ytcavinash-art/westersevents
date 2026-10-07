const form = document.querySelector("#bookingForm");
const otpPanel = document.querySelector("#otpPanel");
const otpForm = document.querySelector("#otpForm");
const successPanel = document.querySelector("#successPanel");
const alertBox = document.querySelector("#alert");
let requestId = "";

function showAlert(message) {
  alertBox.textContent = message;
  alertBox.classList.remove("hidden");
}
function hideAlert() { alertBox.classList.add("hidden"); }
function setStep(n) {
  document.querySelectorAll(".step").forEach((el, i) => {
    el.classList.toggle("active", i < n);
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert();
  const data = Object.fromEntries(new FormData(form).entries());

  try {
    const res = await fetch("/api/enquiries/start", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.errors?.join(" ") || "Could not send OTP.");

    requestId = json.requestId;
    form.classList.add("hidden");
    otpPanel.classList.remove("hidden");
    document.querySelector("#otpText").textContent =
      `OTP sent. Reference: ${requestId}`;
    setStep(2);
  } catch (err) {
    showAlert(err.message);
  }
});

otpForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert();
  try {
    const res = await fetch("/api/enquiries/verify", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        requestId,
        code: document.querySelector("#otpCode").value.trim()
      })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "Verification failed.");

    otpPanel.classList.add("hidden");
    successPanel.classList.remove("hidden");
    document.querySelector("#requestIdText").textContent = requestId;
    setStep(3);
  } catch (err) {
    showAlert(err.message);
  }
});
