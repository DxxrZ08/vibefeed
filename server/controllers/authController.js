const { createSession, getUser, upsertUser } = require('../services/authStore');

const decodeJwtPayload = (token = '') => {
  const parts = String(token).split('.');
  if (parts.length < 2) return {};

  const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

  try {
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return {};
  }
};

const getToken = (req) => {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return req.body?.idToken || req.query?.idToken || null;
};

const mapUser = (user) => ({
  _id: user.uid,
  firebaseUid: user.uid,
  name: user.name,
  email: user.email,
  role: user.role,
  preferences: user.interests,
  authProviders: user.authProviders,
  onboardingCompleted: user.onboardingCompleted,
  regions: user.regions,
  notifications: user.notifications,
});

const createSessionController = async (req, res) => {
  const token = getToken(req);
  const payload = token ? decodeJwtPayload(token) : {};
  const email = req.body?.email || payload.email;
  const uid = req.body?.uid || payload.user_id || payload.sub || email;
  const name = req.body?.name || payload.name || (email ? email.split('@')[0] : 'Reader');
  const provider = req.body?.provider || payload.firebase?.sign_in_provider || 'password';

  if (!email) {
    return res.status(400).json({ message: 'An email address is required.' });
  }

  const session = createSession({
    uid,
    email,
    name,
    provider,
    idToken: token,
  });

  return res.json({
    sessionId: session.sessionId,
    user: mapUser(session.user),
  });
};

const getProfileController = async (req, res) => {
  const token = getToken(req);
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  const payload = decodeJwtPayload(token);
  const email = req.query?.email || payload.email;
  const uid = req.query?.uid || payload.user_id || payload.sub || email;
  const user = getUser({ uid, email });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  return res.json(mapUser(user));
};

const updateProfileController = async (req, res) => {
  const token = getToken(req);
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  const payload = decodeJwtPayload(token);
  const email = req.body?.email || payload.email;
  const uid = req.body?.uid || payload.user_id || payload.sub || email;

  if (!uid || !email) {
    return res.status(400).json({ message: 'uid and email are required.' });
  }

  const user = upsertUser({
    uid,
    email,
    name: req.body?.name,
    provider: req.body?.provider,
  });

  if (Array.isArray(req.body?.interests)) user.interests = req.body.interests;
  if (Array.isArray(req.body?.regions)) user.regions = req.body.regions;
  if (typeof req.body?.onboardingCompleted === 'boolean') user.onboardingCompleted = req.body.onboardingCompleted;

  return res.json(mapUser(user));
};

module.exports = {
  createSessionController,
  getProfileController,
  updateProfileController,
};
