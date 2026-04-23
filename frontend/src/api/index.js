import api from './axiosInstance'

// ── Auth ─────────────────────────────────────────────────────
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
}

// ── Transactions ─────────────────────────────────────────────
export const transactionApi = {
  getAll:      (params) => api.get('/transactions', { params }),
  getById:     (id)     => api.get(`/transactions/${id}`),
  getFlagged:  ()       => api.get('/transactions/flagged'),
  create:      (data)   => api.post('/transactions', data),
  update:      (id, data) => api.put(`/transactions/${id}`, data),
  delete:      (id)     => api.delete(`/transactions/${id}`),
}

// ── Budgets ──────────────────────────────────────────────────
export const budgetApi = {
  getAll:        (params) => api.get('/budgets', { params }),
  createOrUpdate:(data)   => api.post('/budgets', data),
  delete:        (id)     => api.delete(`/budgets/${id}`),
}

// ── Alerts ───────────────────────────────────────────────────
export const alertApi = {
  getAll:       (params) => api.get('/alerts', { params }),
  getCount:     ()       => api.get('/alerts/count'),
  markRead:     (id)     => api.patch(`/alerts/${id}/read`),
  markAllRead:  ()       => api.patch('/alerts/read-all'),
}
