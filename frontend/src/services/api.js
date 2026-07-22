const API_BASE = '/api';

export const getAuthToken = () => localStorage.getItem('fkip_token');
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('fkip_token', token);
  } else {
    localStorage.removeItem('fkip_token');
  }
};

export const getUserRole = () => localStorage.getItem('fkip_user_role');
export const setUserRole = (role) => {
  if (role) {
    localStorage.setItem('fkip_user_role', role);
  } else {
    localStorage.removeItem('fkip_user_role');
  }
};

const request = async (method, path, body = null, isMultipart = false) => {
  const token = getAuthToken();
  const headers = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = isMultipart ? body : JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${path}`, options);

  if (response.status === 401) {
    // Session expired, clear tokens
    setAuthToken(null);
    setUserRole(null);
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'An error occurred during network request');
  }

  return response.json();
};

export const api = {
  // Auth endpoints
  login: async (email, password) => {
    const data = await request('POST', '/auth/login', { email, password, role: 'CONSUMER' });
    setAuthToken(data.access_token);
    // Fetch profile to get role
    const profile = await request('GET', '/auth/me');
    setUserRole(profile.role);
    return profile;
  },
  
  register: async (email, password, role) => {
    return request('POST', '/auth/register', { email, password, role });
  },

  me: async () => {
    return request('GET', '/auth/me');
  },

  // Document endpoints
  getDocuments: async () => {
    return request('GET', '/documents');
  },

  uploadDocument: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('POST', '/documents/upload', formData, true);
  },

  // Search endpoints
  hybridSearch: async (query, limit = 5) => {
    return request('POST', '/search/hybrid', { query, limit });
  },

  chat: async (messages) => {
    return request('POST', '/search/chat', { messages });
  },

  submitFeedback: async (logId, rating, comments = '') => {
    return request('POST', '/search/feedback', { log_id: logId, rating, comments });
  },

  get: async (path) => {
    return request('GET', path);
  },

  post: async (path, body) => {
    return request('POST', path, body);
  },

  put: async (path, body) => {
    return request('PUT', path, body);
  },

  delete: async (path) => {
    return request('DELETE', path);
  },

  postMultipart: async (path, formData) => {
    return request('POST', path, formData, true);
  }
};
