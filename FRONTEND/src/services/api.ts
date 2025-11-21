const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export async function postJson(path: string, body: any, token?: string) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Si el token es inválido (401), disparar evento para limpiar sesión
    if (res.status === 401 && token) {
      window.dispatchEvent(new CustomEvent('auth:token-invalid'));
    }
    throw { status: res.status, data };
  }
  return data;
}

export async function patchJson(path: string, body: any, token?: string) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Si el token es inválido (401), disparar evento para limpiar sesión
    if (res.status === 401 && token) {
      window.dispatchEvent(new CustomEvent('auth:token-invalid'));
    }
    throw { status: res.status, data };
  }
  return data;
}

export async function getJson(path: string, token?: string) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Si el token es inválido (401), disparar evento para limpiar sesión
    if (res.status === 401 && token) {
      window.dispatchEvent(new CustomEvent('auth:token-invalid'));
    }
    throw { status: res.status, data };
  }
  return data;
}
