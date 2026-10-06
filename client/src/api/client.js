import { getToken } from '../lib/session.js';

export const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000');

export async function api(path, { method = 'GET', body } = {}) {
  const token = getToken();
  const isForm = body instanceof FormData;
  const res = await fetch(`${API}/api${path}`, {
    method,
    headers: {
      ...(!isForm && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));

  // An expired or invalid session anywhere in the app logs the user out (handled in AuthContext)
  if (res.status === 401 && !path.startsWith('/auth/login')) {
    window.dispatchEvent(new Event('auth:expired'));
  }

  if (!res.ok) {
    const err = new Error(data.message || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function downloadFile(docId, filename) {
  const res = await fetch(`${API}/api/documents/${docId}/file`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Download failed');
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
