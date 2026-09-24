const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

async function request(path, options = {}) {
  const url = `${API_URL}${path}`;
  const requestHeaders = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (process.env.NODE_ENV !== 'production') console.debug('[Show Up API] request', { url, method: options.method || 'GET', hasBody: Boolean(options.body), bodyLength: options.body?.length || 0 });
  const response = await fetch(url, {
    ...options,
    headers: requestHeaders,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const requestId = response.headers.get('x-request-id');
    const suffix = requestId ? ` (Request ID: ${requestId})` : '';
    throw new Error(`${body.error || 'Something went wrong'}${suffix}`);
  }
  return body;
}

export const api = {
  signup: (payload) => request('/auth/signup', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  validateInvitation: (token) => request(`/invitations/validate?token=${encodeURIComponent(token)}`),
  registerInvitation: (payload) => request('/auth/invitation-register', { method: 'POST', body: JSON.stringify(payload) }),
  me: (token) => request('/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
  generate: (token, payload) => {
    if (!payload?.prompt?.trim()) throw new Error('Generation prompt is empty. Please complete the form and try again.');
    return request('/generate', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
  },
  saveCalendar: (token, payload) => request('/calendar/save', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) }),
  calendars: (token) => request('/calendars', { headers: { Authorization: `Bearer ${token}` } }),
  calendar: (token, id) => request(`/calendar/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
  adminMembers: (token, params = {}) => request(`/admin/invitations/members?${new URLSearchParams(params)}`, { headers: { Authorization: `Bearer ${token}` } }),
  adminMember: (token, id) => request(`/admin/invitations/members/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
  adminInvite: (token, payload) => request('/admin/invitations', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) }),
  adminResend: (token, id) => request(`/admin/invitations/${id}/resend`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }),
  adminRevoke: (token, id) => request(`/admin/invitations/members/${id}/revoke`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }),
  adminRestore: (token, id) => request(`/admin/invitations/members/${id}/restore`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }),
};
