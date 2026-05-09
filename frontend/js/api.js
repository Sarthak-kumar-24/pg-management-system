/* ═══════════════════════════════════════════════════════════════
   api.js  —  Centralized fetch wrapper + every API endpoint
═══════════════════════════════════════════════════════════════ */
const API_BASE = '/api';

const Api = {
  async req(method, path, body = null) {
    const token = localStorage.getItem('pg_token');
    const opts  = { method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body)  opts.body = JSON.stringify(body);
    let data;
    try {
      const res = await fetch(API_BASE + path, opts);
      data = await res.json();
      if (!res.ok) {
        if (res.status === 401) { Auth.logout(); return null; }
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      return data;
    } catch (err) {
      if (err.message !== 'Failed to fetch') throw err;
      throw new Error('Cannot reach server. Is it running?');
    }
  },
  get:    (p)    => Api.req('GET',    p),
  post:   (p, b) => Api.req('POST',   p, b),
  put:    (p, b) => Api.req('PUT',    p, b),
  patch:  (p, b) => Api.req('PATCH',  p, b),
  delete: (p)    => Api.req('DELETE', p),

  auth: {
    login:          b  => Api.post('/auth/login',    b),
    register:       b  => Api.post('/auth/register', b),
    me:             () => Api.get('/auth/me'),
    updateProfile:  b  => Api.put('/auth/profile',  b),
    changePassword: b  => Api.put('/auth/password', b),
  },
  buildings: {
    list:   ()      => Api.get('/buildings'),
    get:    id      => Api.get(`/buildings/${id}`),
    create: b       => Api.post('/buildings', b),
    update: (id, b) => Api.put(`/buildings/${id}`, b),
    delete: id      => Api.delete(`/buildings/${id}`),
  },
  rooms: {
    list:           q       => Api.get('/rooms' + qStr(q)),
    get:            id      => Api.get(`/rooms/${id}`),
    create:         b       => Api.post('/rooms', b),
    update:         (id, b) => Api.put(`/rooms/${id}`, b),
    delete:         id      => Api.delete(`/rooms/${id}`),
    toggleCleaning: id      => Api.patch(`/rooms/${id}/cleaning`, {}),
    vacantBeds:     bldg    => Api.get('/rooms/vacant/beds' + (bldg ? `?building=${bldg}` : '')),
  },
  tenants: {
    list:   q       => Api.get('/tenants' + qStr(q)),
    get:    id      => Api.get(`/tenants/${id}`),
    create: b       => Api.post('/tenants', b),
    update: (id, b) => Api.put(`/tenants/${id}`, b),
    delete: id      => Api.delete(`/tenants/${id}`),
    vacate: (id, b) => Api.post(`/tenants/${id}/vacate`, b),
  },
  payments: {
    list:            q       => Api.get('/payments' + qStr(q)),
    get:             id      => Api.get(`/payments/${id}`),
    create:          b       => Api.post('/payments', b),
    update:          (id, b) => Api.put(`/payments/${id}`, b),
    delete:          id      => Api.delete(`/payments/${id}`),
    stats:           q       => Api.get('/payments/stats/summary' + qStr(q)),
    generateMonthly: b       => Api.post('/payments/generate-monthly', b),
    addElectricity:  b       => Api.post('/payments/electricity', b),
  },
  bills: {
    list:   q       => Api.get('/bills' + qStr(q)),
    create: b       => Api.post('/bills', b),
    update: (id, b) => Api.put(`/bills/${id}`, b),
    delete: id      => Api.delete(`/bills/${id}`),
  },
  complaints: {
    list:   q       => Api.get('/complaints' + qStr(q)),
    get:    id      => Api.get(`/complaints/${id}`),
    create: b       => Api.post('/complaints', b),
    update: (id, b) => Api.put(`/complaints/${id}`, b),
    delete: id      => Api.delete(`/complaints/${id}`),
  },
  notices: {
    list:   q       => Api.get('/notices' + qStr(q)),
    create: b       => Api.post('/notices', b),
    update: (id, b) => Api.put(`/notices/${id}`, b),
    delete: id      => Api.delete(`/notices/${id}`),
  },
  documents: {
    list:   q       => Api.get('/documents' + qStr(q)),
    get:    id      => Api.get(`/documents/${id}`),
    create: b       => Api.post('/documents', b),
    delete: id      => Api.delete(`/documents/${id}`),
  },
  reports: {
    dashboard: q => Api.get('/reports/dashboard' + qStr(q)),
    income:    q => Api.get('/reports/income'    + qStr(q)),
    expenses:  q => Api.get('/reports/expenses'  + qStr(q)),
    occupancy: q => Api.get('/reports/occupancy' + qStr(q)),
    profit:    q => Api.get('/reports/profit'    + qStr(q)),
  },
  users: {
    list:   ()      => Api.get('/users'),
    create: b       => Api.post('/users', b),
    update: (id, b) => Api.put(`/users/${id}`, b),
    delete: id      => Api.delete(`/users/${id}`),
  },
};

function qStr(q) {
  if (!q) return '';
  const p = new URLSearchParams();
  Object.entries(q).forEach(([k, v]) => { if (v !== '' && v != null) p.set(k, v); });
  const s = p.toString();
  return s ? '?' + s : '';
}
