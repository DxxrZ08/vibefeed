const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const resolveUserRole = ({ email = '', existingRole = 'user' } = {}) => {
  if (existingRole === 'admin') {
    return 'admin';
  }

  return adminEmails.includes(String(email).toLowerCase()) ? 'admin' : 'user';
};

export const isAdminRole = (role = 'user') => role === 'admin';
