/* Minimal background runner script for Capacitor BackgroundRunner
   It keeps a lightweight periodic task alive while audio is playing
   so the app remains responsive in background. */

let timer = null;

function postHeartbeat() {
  try {
    // No-op heartbeat to keep worker active
    // You can extend this to post messages back if needed
  } catch {}
}

self.addEventListener('backgroundTaskEvent', () => {
  try {
    if (timer) clearInterval(timer);
    timer = setInterval(postHeartbeat, 15000);
  } catch {}
});

// Graceful stop
self.addEventListener('message', (e) => {
  if (e && e.data === 'STOP_BACKGROUND') {
    if (timer) clearInterval(timer);
    timer = null;
  }
});

