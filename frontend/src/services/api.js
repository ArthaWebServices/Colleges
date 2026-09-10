import axios from 'axios';

const formatBaseUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim() === '') return '/api';
  let cleanUrl = rawUrl.trim().replace(/\/+$/, '');
  if (!cleanUrl.endsWith('/api')) {
    cleanUrl += '/api';
  }
  return cleanUrl;
};

const API_BASE_URL = formatBaseUrl(import.meta.env.VITE_API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Fetch all course tags
 */
export const getCourses = async () => {
  const response = await api.get('/courses');
  return response.data;
};

/**
 * Fetch public announcements with optional course and search query
 */
export const getAnnouncements = async (course = '', search = '', startDate = '', endDate = '', type = '', year = '') => {
  const params = {};
  if (course && course !== 'ALL') params.course = course;
  if (search) params.search = search;
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  if (type && type !== 'ALL') params.type = type;
  if (year && year !== 'ALL') params.year = year;

  const response = await api.get('/announcements', { params });
  return response.data;
};

/**
 * Fetch a single announcement detail
 */
export const getAnnouncementById = async (id) => {
  const response = await api.get(`/announcements/${id}`);
  return response.data;
};

/**
 * Fetch announcements created by the currently logged-in HOD
 */
export const getMyAnnouncements = async (getToken) => {
  const token = await getToken();
  const response = await api.get('/announcements/mine', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

/**
 * Create a new announcement
 */
export const createAnnouncement = async (data, getToken) => {
  const token = await getToken();
  const response = await api.post('/announcements', data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

/**
 * Update an existing announcement
 */
export const updateAnnouncement = async (id, data, getToken) => {
  const token = await getToken();
  const response = await api.put(`/announcements/${id}`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

/**
 * Delete an announcement
 */
export const deleteAnnouncement = async (id, getToken) => {
  const token = await getToken();
  const response = await api.delete(`/announcements/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

/**
 * Fetch all registered HOD accounts (Super-Admin)
 */
export const getHodList = async (adminSecret) => {
  const response = await api.get('/admin/hods', {
    headers: {
      'x-admin-secret': adminSecret,
    },
  });
  return response.data;
};

/**
 * Approve or revoke an HOD account (Super-Admin)
 */
export const toggleHodApproval = async (userId, isApproved, adminSecret) => {
  const response = await api.post(
    '/admin/approve-hod',
    { userId, isApproved },
    {
      headers: {
        'x-admin-secret': adminSecret,
      },
    }
  );
  return response.data;
};

/**
 * Assign allowed course codes to an HOD account (Super-Admin)
 */
export const assignHodCourses = async (userId, allowedCourses, adminSecret) => {
  const response = await api.post(
    '/admin/assign-courses',
    { userId, allowedCourses },
    {
      headers: {
        'x-admin-secret': adminSecret,
      },
    }
  );
  return response.data;
};

/**
 * Permanently delete a fake or unauthorized HOD account (Super-Admin)
 */
export const deleteHodAccount = async (userId, adminSecret, deleteNotices = true) => {
  const response = await api.delete(`/admin/hods/${userId}`, {
    headers: {
      'x-admin-secret': adminSecret,
    },
    data: {
      deleteNotices,
    },
  });
  return response.data;
};

/**
 * Fetch all announcements across college for Super-Admin Audit
 */
export const getAllAnnouncementsAudit = async (adminSecret) => {
  const response = await api.get('/admin/announcements', {
    headers: {
      'x-admin-secret': adminSecret,
    },
  });
  return response.data;
};

/**
 * Fetch VAPID public key
 */
export const getVapidPublicKey = async () => {
  const response = await api.get('/notifications/vapid-public-key');
  return response.data;
};

/**
 * Register push subscription
 */
export const subscribeNotifications = async (payload) => {
  const response = await api.post('/notifications/subscribe', payload);
  return response.data;
};

/**
 * Remove push subscription
 */
export const unsubscribeNotifications = async (endpoint) => {
  const response = await api.post('/notifications/unsubscribe', { endpoint });
  return response.data;
};
