const BASE_URL = 'http://localhost:5000/api';

const getToken = () => localStorage.getItem('edu_token');

const headers = (extra = {}) => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
  ...extra,
});

const handle = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

// Auth
export const authAPI = {
  register: (body) => fetch(`${BASE_URL}/auth/register`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(handle),
  login: (body) => fetch(`${BASE_URL}/auth/login`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(handle),
  me: () => fetch(`${BASE_URL}/auth/me`, { headers: headers() }).then(handle),
};

// Predictions
export const predictAPI = {
  predict: (body) => fetch(`${BASE_URL}/predict`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(handle),
  getLatest: () => fetch(`${BASE_URL}/predictions/latest`, { headers: headers() }).then(handle),
  getAll: () => fetch(`${BASE_URL}/predictions`, { headers: headers() }).then(handle),
  getRecord: () => fetch(`${BASE_URL}/academic-record`, { headers: headers() }).then(handle),
};

// Admin
export const adminAPI = {
  getOverview: () => fetch(`${BASE_URL}/analytics/overview`, { headers: headers() }).then(handle),
  getStudents: () => fetch(`${BASE_URL}/analytics/students`, { headers: headers() }).then(handle),
  getStudentDetail: (id) => fetch(`${BASE_URL}/analytics/student/${id}`, { headers: headers() }).then(handle),
  getAllPredictions: () => fetch(`${BASE_URL}/admin/predictions`, { headers: headers() }).then(handle),
};

// Upload
export const uploadAPI = {
  uploadFile: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      headers: { ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
      body: fd,
    }).then(handle);
  },
  getTemplate: () => fetch(`${BASE_URL}/upload/template`, { headers: headers() }).then(handle),
};

// Resources
export const resourceAPI = {
  getAll: () => fetch(`${BASE_URL}/resources`, { headers: headers() }).then(handle),
};
