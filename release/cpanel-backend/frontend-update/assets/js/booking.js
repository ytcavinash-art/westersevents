import { BOOKING_API_BASE } from './booking-config.js';
﻿const root = document.querySelector('.westers-booking');
const form = root.querySelector('#bookingForm');
const client = root.querySelector('[data-stage="client"]');
const event = root.querySelector('[data-stage="event"]');
const alertBox = root.querySelector('#alert');
let requestId = '';
let resendToken = '';
let verifying = false;
function step(n) {
  root.querySelectorAll('.step').forEach((el, i) => {
    el.classList.toggle('active', i < n);
    if (i === n - 1) el.setAttribute('aria-current', 'step');
    else el.removeAttribute('aria-current');
  });
}
function stage(showEvent) {
  client.hidden = showEvent; client.disabled = showEvent;
  event.hidden = !showEvent; event.disabled = !showEvent;
  step(showEvent ? 2 : 1);
  (showEvent ? event : client).querySelector('input, select').focus();
}
function message(text) {
  const inOtp = !root.querySelector('#otpPanel').classList.contains('hidden');
  alertBox.textContent = inOtp ? '' : text; alertBox.classList.toggle('hidden', inOtp || !text);
  root.querySelector('#statusMessage').textContent = inOtp ? text : '';
}
root.querySelector('#eventDetailsNext').onclick = () => { if (form.reportValidity()) stage(true); };
root.querySelector('#clientDetailsBack').onclick = () => stage(false);
async function api(route, data) {
  const response = await fetch(BOOKING_API_BASE + '/api/enquiries/' + route, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data), signal:AbortSignal.timeout(30000)});
  if (!response.headers.get('content-type')?.includes('application/json')) throw Error('Booking service is unavailable. Please open the Westers website at localhost:3000.');
  const result = await response.json();
  if (!response.ok) throw Error(result.message || result.errors?.join(' ') || 'Please try again.');
  return result;
}
async function busy(button, work) {
  button.disabled = true; message('');
  try { await work(); } catch(error) { message(error.name === 'TimeoutError' ? 'The request timed out. Please try again.' : error.message); }
  finally { button.disabled = false; }
}
form.addEventListener('submit', e => {
  e.preventDefault();
  busy(form.querySelector('[type="submit"]'), async () => {
    client.disabled = false;
    const data = Object.fromEntries(new FormData(form));
    client.disabled = true;
    const result = await api('start', data);
    requestId = result.requestId; resendToken = result.resendToken;
    form.classList.add('hidden');
    root.querySelector('#otpPanel').classList.remove('hidden');
    root.querySelector('#otpText').textContent = maskContact(data.verifyChannel === 'email' ? data.email : data.phone, data.verifyChannel);
    root.querySelector('#verifyHeading').textContent = data.verifyChannel === 'email' ? 'Verify your email' : 'Verify your number';
    resetOrbit(); otpInputs.forEach(input => input.value = '');
    startTimer(); step(3); otpInputs[0].focus();
  });
});
root.querySelector('#otpForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (verifying || verified) return;
  const code = otpInputs.map(input => input.value).join('');
  if (!/^[0-9]{4}$/.test(code)) { message('Enter all four digits.'); return; }
  verifying = true;
  otpInputs.forEach(input => input.readOnly = true);
  verifyBtn.disabled = true; resendBtn.disabled = true;
  root.querySelector('#otpForm').setAttribute('aria-busy', 'true');
  statusMessage.classList.remove('error'); message('Verifying your code...');
  const motion = turnOrbit();
  try {
    const result = await api('verify', {requestId, resendToken, code});
    await motion;
    verified = true; clearInterval(timerInterval);
    orbit.dataset.state = 'settling';
    await motionDelay(500);
    orbit.dataset.state = 'verified';
    message('Contact verified. Your event request is saved.');
    root.querySelector('#requestIdText').textContent = requestId;
    const labels = ['Contact Verified','Requirement Submitted','Westers Team Assigned','Consultation Scheduled','Proposal Sent','Proposal Approved','Advance Received','Event Confirmed'];
    root.querySelector('#requestTimeline').replaceChildren(...labels.map((label,i) => {
      const item = document.createElement('li'); item.classList.toggle('done',i<2); item.textContent=(i<2?'\u2713 ':'\u25cb ')+label; return item;
    }));
    root.querySelector('#deliveryStatus').textContent = 'Your request is saved. Brochure and WhatsApp delivery may still be pending.';
    verifyBtn.hidden = true;
    continueBtn.hidden = false;
    root.querySelector('.resend-row').hidden = true;
    continueBtn.focus();
  } catch(error) {
    await motion;
    orbit.dataset.state = 'error'; statusMessage.classList.add('error');
    message(error.name === 'TimeoutError' ? 'Verification timed out. Please try again.' : error.message);
    otpInputs.forEach(input => { input.readOnly = false; input.value = ''; });
    otpInputs[0].focus();
  } finally {
    verifying = false; verifyBtn.disabled = false; updateTimer();
    root.querySelector('#otpForm').removeAttribute('aria-busy');
  }
});
root.querySelector('#anotherEvent').onclick = () => {
  resetOrbit(); root.querySelector('#otpPanel').classList.add('hidden');
  clearInterval(timerInterval); form.reset(); requestId = ''; resendToken = ''; message('');
  root.querySelector('#successPanel').classList.add('hidden');
  form.classList.remove('hidden'); stage(false);
};
step(1);

const otpInputs = [...root.querySelectorAll('.otp-box')];
const resendBtn = root.querySelector('#resendBtn');
const orbit = root.querySelector('.orbit-area');
const verifyBtn = root.querySelector('#verifyBtn');
const continueBtn = root.querySelector('#continueBtn');
const statusMessage = root.querySelector('#statusMessage');
let verified = false;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const motionDelay = ms => new Promise(resolve => setTimeout(resolve, reducedMotion.matches ? 0 : ms));
async function turnOrbit() {
  orbit.dataset.state = 'curling';
  await motionDelay(420);
  orbit.dataset.state = 'turning';
  await motionDelay(1250);
  orbit.dataset.state = 'waiting';
}
function resetOrbit() {
  verified = false; orbit.dataset.state = 'idle';
  otpInputs.forEach(input => input.readOnly = false);
  statusMessage.classList.remove('error'); verifyBtn.hidden = false; continueBtn.hidden = true;
  root.querySelector('.resend-row').hidden = false;
}
let timerInterval;
let resendAt = 0;
function maskContact(value, channel) {
  if (channel === 'email') { const [name, domain] = value.split('@'); return name.slice(0, 2) + '\u2022\u2022\u2022\u2022@' + domain; }
  const phone = value.replace(/[^+0-9]/g, ''); return phone.slice(0, 3) + ' \u2022\u2022\u2022\u2022 ' + phone.slice(-2);
}
function fillDigits(value, index) {
  if (verifying || verified) return;
  orbit.dataset.state = 'idle'; statusMessage.classList.remove('error');
  const digits = value.replace(/\D/g, '').slice(0, 4);
  const start = digits.length === 4 ? 0 : index;
  if (digits.length > 1) otpInputs.slice(start).forEach(input => input.value = '');
  [...digits].forEach((digit, i) => { if (otpInputs[start+i]) otpInputs[start+i].value = digit; });
  if (digits.length) otpInputs[Math.min(start + digits.length, 3)].focus();
  if (otpInputs.every(input => /^[0-9]$/.test(input.value))) root.querySelector('#otpForm').requestSubmit();
}
otpInputs.forEach((input, index) => {
  input.addEventListener('input', () => { const value = input.value; input.value = ''; fillDigits(value, index); });
  input.addEventListener('paste', e => { e.preventDefault(); fillDigits(e.clipboardData.getData('text'), index); });
  input.addEventListener('focus', () => input.select());
  input.addEventListener('keydown', e => {
    if (e.key === 'Backspace' && !input.value && index > 0) otpInputs[index-1].focus();
    if (e.key === 'ArrowLeft' && index > 0) { e.preventDefault(); otpInputs[index-1].focus(); }
    if (e.key === 'ArrowRight' && index < 3) { e.preventDefault(); otpInputs[index+1].focus(); }
  });
});
function updateTimer() {
  const remaining = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));
  resendBtn.textContent = remaining ? 'Resend in ' + remaining + 's' : 'Resend OTP';
  resendBtn.disabled = remaining > 0 || verifying || verified;
  if (!remaining) clearInterval(timerInterval);
}
function startTimer() { clearInterval(timerInterval); resendAt = Date.now()+30000; updateTimer(); timerInterval = setInterval(updateTimer, 1000); }
resendBtn.addEventListener('click', async () => {
  if (verifying || verified) return;
  verifying = true; otpInputs.forEach(input => input.readOnly = true);
  resendBtn.disabled = true; verifyBtn.disabled = true; message('');
  try {
    await api('resend', {requestId, resendToken});
    otpInputs.forEach(input => input.value = ''); startTimer(); otpInputs[0].focus(); message('A new OTP has been sent.');
  } catch (error) { message(error.message); updateTimer(); }
  finally { verifying = false; otpInputs.forEach(input => input.readOnly = false); verifyBtn.disabled = false; updateTimer(); }
});
continueBtn.onclick = () => {
  root.querySelector('#otpPanel').classList.add('hidden');
  const panel = root.querySelector('#successPanel'); panel.classList.remove('hidden'); panel.tabIndex = -1; panel.focus();
};

root.querySelector('#refreshRequest').onclick = () => busy(root.querySelector('#refreshRequest'), async () => {
  const response = await fetch(BOOKING_API_BASE + '/api/enquiries/' + encodeURIComponent(requestId) + '/status', {headers:{Authorization:'Bearer ' + resendToken}, signal:AbortSignal.timeout(15000)});
  const data = await response.json();
  if (!response.ok) throw Error(data.message || 'Could not refresh status.');
  const stages = ['VERIFIED','CONTACTED','MEETING','QUOTATION','NEGOTIATION','APPROVED','ADVANCE_PAID','CONFIRMED','COMPLETED'];
  const rank = stages.indexOf(data.enquiry.status);
  const checks = [data.enquiry.verified, data.enquiry.verified, rank >= 1, rank >= 2, rank >= 3, rank >= 5, rank >= 6, rank >= 7];
  root.querySelectorAll('#requestTimeline li').forEach((item,i) => { item.classList.toggle('done',Boolean(checks[i])); item.textContent = (checks[i] ? '\u2713 ' : '\u25cb ') + item.textContent.slice(2); });
  root.querySelector('#deliveryStatus').textContent = data.enquiry.status === 'CANCELLED' ? 'This enquiry has been cancelled.' : data.deliveries.map(d => d.channel + ': ' + d.status.replaceAll('_',' ')).join(' ? ');
});
