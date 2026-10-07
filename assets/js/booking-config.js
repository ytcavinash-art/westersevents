const isLocalhost = typeof window !== 'undefined' && Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '[::1]'
);

// Automatically uses http://localhost:3000 during local development,
// and same-origin ("") on live production website (https://westers.in).
export const BOOKING_API_BASE = isLocalhost
  ? "http://localhost:3000"
  : "";


