const { randomUUID } = require('crypto');

const users = new Map();
const sessions = new Map();

const normalizeProvider = (provider = 'password') => {
  if (provider === 'google.com') return 'google';
  if (provider === 'facebook.com') return 'facebook';
  return provider;
};

const parseAdminEmails = () =>
  String(process.env.ADMIN_EMAILS || process.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const isAdminEmail = (email = '') => parseAdminEmails().includes(String(email).toLowerCase());

const buildUserRecord = ({ uid, email, name, provider }, existing = {}) => ({
  uid,
  email,
  name: name || existing.name || (email ? email.split('@')[0] : 'Reader'),
  role: existing.role || (isAdminEmail(email) ? 'admin' : 'user'),
  authProviders: Array.from(new Set([...(existing.authProviders || []), normalizeProvider(provider)])),
  onboardingCompleted: existing.onboardingCompleted ?? false,
  interests: existing.interests || [],
  regions: existing.regions || ['us'],
  notifications: existing.notifications || [],
  createdAt: existing.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const upsertUser = ({ uid, email, name, provider }) => {
  const existing = users.get(uid) || users.get(email) || {};
  const record = buildUserRecord({ uid, email, name, provider }, existing);

  users.set(uid, record);
  users.set(email, record);
  return record;
};

const getUser = ({ uid, email }) => users.get(uid) || users.get(email) || null;

const createSession = ({ uid, email, name, provider, idToken }) => {
  const user = upsertUser({ uid, email, name, provider });
  const sessionId = randomUUID();
  const session = {
    sessionId,
    idToken: idToken || null,
    user,
    createdAt: new Date().toISOString(),
  };

  sessions.set(sessionId, session);
  if (idToken) sessions.set(idToken, session);
  sessions.set(user.uid, session);
  return session;
};

const getSession = (value = '') => sessions.get(value) || null;

const updateUser = (uid, updates = {}) => {
  const existing = users.get(uid);
  if (!existing) return null;

  const next = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  users.set(uid, next);
  if (next.email) users.set(next.email, next);
  return next;
};

module.exports = {
  upsertUser,
  getUser,
  createSession,
  getSession,
  updateUser,
  isAdminEmail,
};
