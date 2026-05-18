const API_URL = '';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

function setToken(token: string) {
  localStorage.setItem('token', token);
}

function clearToken() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || err.message || 'Request failed');
  }

  if (res.status === 204) return null as T;
  return res.json();
}

export const api = {
  // Auth
  login: (data: { username: string; password: string }) =>
    request<{ token: string; user: any }>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data: { username: string; password: string; email: string }) =>
    request<any>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request<any>('/api/auth/me'),

  // Vault
  getKeys: () => request<any[]>('/api/vault/keys'),
  addKey: (data: any) => request<any>('/api/vault/keys', { method: 'POST', body: JSON.stringify(data) }),
  deleteKey: (id: string) => request<any>(`/api/vault/keys/${id}`, { method: 'DELETE' }),
  toggleKey: (id: string) => request<any>(`/api/vault/keys/${id}/toggle`, { method: 'PATCH' }),

  // Generate
  generateVideo: (data: any) =>
    request<any>('/api/generate/video', { method: 'POST', body: JSON.stringify(data) }),

  // Tasks
  getTasks: () => request<any[]>('/api/tasks'),
  getTask: (id: string) => request<any>(`/api/tasks/${id}`),

  // Presets
  getPresets: () => request<any[]>('/api/presets'),

  // Uploads
  uploadImage: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<any>('/api/uploads/image', { method: 'POST', body: form });
  },

  // Activity
  getActivity: () => request<any[]>('/api/activity'),
  getActivitySummary: () => request<any>('/api/activity/summary'),

  // Analytics
  getAnalyticsOverview: () => request<any>('/api/analytics/overview'),
  getAnalyticsGlobal: () => request<any>('/api/analytics/global'),

  // Admin
  getUsers: () => request<any[]>('/api/admin/users'),
  getUsersSummary: () => request<any>('/api/admin/users/summary'),
  getHealth: () => request<any>('/api/admin/health'),

  // Campaigns
  getCampaigns: () => request<any[]>('/api/campaigns'),
  createCampaign: (data: any) =>
    request<any>('/api/campaigns', { method: 'POST', body: JSON.stringify(data) }),

  // Assets
  getAssets: (category?: string) =>
    request<any[]>(category ? `/api/assets?category=${category}` : '/api/assets'),
  uploadAsset: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<any>('/api/assets', { method: 'POST', body: form });
  },
  deleteAsset: (id: number) => request<any>(`/api/assets/${id}`, { method: 'DELETE' }),

  // Credits
  getCredits: () => request<any>('/api/credits'),
};

export { getToken, setToken, clearToken };
