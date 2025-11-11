const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export async function startYoutubeOAuth(token: string) {
  if (!token) throw new Error('No auth token');
  const res = await fetch(`${API}/api/integrations/oauth/youtube/start`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err?.error || err?.message || `HTTP ${res.status}`;
    throw new Error(message);
  }

  const data = await res.json();
  // backend responds with { url } when Accept: application/json
  if (!data || !data.url) throw new Error('Invalid response from server');
  return data.url as string;
}

export async function getIntegrationAccounts(token: string) {
  if (!token) throw new Error('No auth token');
  const res = await fetch(`${API}/api/integrations/accounts`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err?.error || err?.message || `HTTP ${res.status}`;
    throw new Error(message);
  }

  const data = await res.json();
  return data;
}

// Trigger backend to fetch latest metrics from connected integration accounts (YouTube)
export async function fetchYoutubeMetrics(token: string, projectId: string) {
  if (!token) throw new Error('No auth token');
  const res = await fetch(`${API}/api/analytics/fetch`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ project: projectId })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err?.error || err?.message || `HTTP ${res.status}`;
    throw new Error(message);
  }

  return await res.json();
}
