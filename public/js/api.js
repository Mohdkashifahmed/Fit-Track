// Shared helpers + one function that talks to the backend.
const $ = id => document.getElementById(id);
const toISO = d => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = n => Number(n || 0).toLocaleString();

async function api(method, path, body) {
  if (CONFIG.USE_MOCK) return mockRequest(method, path, body);
  const res = await fetch(CONFIG.API_BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // sends the session cookie
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.message || 'Request failed'); e.status = res.status; throw e; }
  return data;
}

function toast(message, isError) {
  const t = $('toast'); if (!t) return;
  t.textContent = message; t.className = 'toast show' + (isError ? ' error' : '');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => (t.className = 'toast'), 3200);
}
