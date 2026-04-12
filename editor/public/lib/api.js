export const api = async (url, opts) => {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || res.statusText);
  }
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('json')) return res.json();
  return res.text();
};

export const postJson = (url, data) =>
  api(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const putJson = (url, data) =>
  api(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const uploadImageFile = async (file) => {
  const formData = new FormData();
  formData.append('images', file);
  const result = await api('/api/images', { method: 'POST', body: formData });
  return result[0];
};
