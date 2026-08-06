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

// In-memory SWR API cache map: path -> { data, timestamp }
const cacheMap = new Map();
const DEFAULT_CACHE_TTL_MS = 60000; // 60s cache TTL

export const clearApiCache = () => cacheMap.clear();

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
    // Session expired, clear tokens & cache
    setAuthToken(null);
    setUserRole(null);
    clearApiCache();
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'An error occurred during network request');
  }

  const data = await response.json();

  // Cache GET requests
  if (method === 'GET') {
    cacheMap.set(path, { data, timestamp: Date.now() });
  } else {
    // Invalidate GET cache on mutation operations
    clearApiCache();
  }

  return data;
};

export const api = {
  // Auth endpoints
  login: async (email, password) => {
    clearApiCache();
    const data = await request('POST', '/auth/login', { email, password, role: 'CONSUMER' });
    setAuthToken(data.access_token);
    // Fetch profile to get role
    const profile = await request('GET', '/auth/me');
    setUserRole(profile.role);
    return profile;
  },
  
  register: async (email, password, role) => {
    clearApiCache();
    return request('POST', '/auth/register', { email, password, role });
  },

  me: async () => {
    return request('GET', '/auth/me');
  },

  // Document endpoints
  getDocuments: async (options = {}) => {
    return api.get('/documents', options);
  },

  uploadDocument: async (file) => {
    clearApiCache();
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
    clearApiCache();
    return request('POST', '/search/feedback', { log_id: logId, rating, comments });
  },

  get: async (path, options = {}) => {
    const { useCache = true, ttlMs = DEFAULT_CACHE_TTL_MS, onBackgroundUpdate = null } = options;
    const cached = cacheMap.get(path);
    
    if (useCache && cached && (Date.now() - cached.timestamp < ttlMs)) {
      // Trigger background revalidation asynchronously
      if (onBackgroundUpdate) {
        request('GET', path).then(freshData => {
          onBackgroundUpdate(freshData);
        }).catch(() => {});
      }
      return cached.data;
    }

    return request('GET', path);
  },

  post: async (path, body) => {
    clearApiCache();
    return request('POST', path, body);
  },

  put: async (path, body) => {
    clearApiCache();
    return request('PUT', path, body);
  },

  delete: async (path) => {
    clearApiCache();
    return request('DELETE', path);
  },

  postMultipart: async (path, formData) => {
    clearApiCache();
    return request('POST', path, formData, true);
  },

  clearCache: clearApiCache
};
