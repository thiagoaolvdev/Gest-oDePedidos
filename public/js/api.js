const API = {
  baseUrl: '/api',
  token: null,
  refreshToken: null,

  init() {
    this.token = localStorage.getItem('token');
    this.refreshToken = localStorage.getItem('refreshToken');
  },

  async request(method, path, data = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    const opts = { method, headers };
    if (data && method !== 'GET') {
      opts.body = JSON.stringify(data);
    }
    const res = await fetch(`${this.baseUrl}${path}`, opts);
    if (res.status === 401) {
      const errorData = await res.json().catch(() => ({}));
      if (errorData.code === 'TOKEN_EXPIRED') {
        const refreshed = await this.tryRefresh();
        if (refreshed) {
          headers['Authorization'] = `Bearer ${this.token}`;
          const retryRes = await fetch(`${this.baseUrl}${path}`, opts);
          if (!retryRes.ok) {
            const err = await retryRes.json().catch(() => ({ error: 'Erro na requisição' }));
            throw err;
          }
          return retryRes.json();
        }
        this.logout();
        throw { error: 'Sessão expirada. Faça login novamente.' };
      }
      throw errorData;
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erro na requisição' }));
      throw err;
    }
    if (res.status === 204) return null;
    return res.json();
  },

  async tryRefresh() {
    if (!this.refreshToken) return false;
    try {
      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken })
      });
      if (!res.ok) return false;
      const data = await res.json();
      this.token = data.token;
      this.refreshToken = data.refreshToken;
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      return true;
    } catch {
      return false;
    }
  },

  login(nick, password) {
    return this.request('POST', '/auth/login', { nick, password });
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    this.token = null;
    this.refreshToken = null;
    window.location.href = '/';
  },

  get(path) { return this.request('GET', path); },
  post(path, data) { return this.request('POST', path, data); },
  put(path, data) { return this.request('PUT', path, data); },
  patch(path, data) { return this.request('PATCH', path, data); },
  del(path) { return this.request('DELETE', path); },

  async upload(path, formData) {
    const headers = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const res = await fetch(`${this.baseUrl}${path}`, { method: 'POST', headers, body: formData });
    if (!res.ok) {
      let errMsg = 'Erro no upload';
      try { const body = await res.json(); errMsg = body.error || errMsg; } catch {}
      throw { error: errMsg };
    }
    return res.json();
  }
};

API.init();
