const express = require('express');
const { createSession, getSession, getUser, upsertUser } = require('../services/authStore');

const router = express.Router();

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

const getAuthToken = (req) => {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return req.body?.idToken || req.query?.idToken || null;
};

const buildSessionPayload = (session) => ({
  sessionId: session.sessionId,
  user: {
    _id: session.user.uid,
    firebaseUid: session.user.uid,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
    preferences: session.user.interests,
    authProviders: session.user.authProviders,
    onboardingCompleted: session.user.onboardingCompleted,
    regions: session.user.regions,
    notifications: session.user.notifications,
  },
});

router.post('/session', (req, res) => {
  try {
    const token = getAuthToken(req);
    const payload = token ? decodeJwtPayload(token) : {};
    const email = req.body.email || payload.email;
    const uid = req.body.uid || payload.user_id || payload.sub || email;
    const name = req.body.name || payload.name || (email ? email.split('@')[0] : 'Reader');
    const provider = req.body.provider || payload.firebase?.sign_in_provider || 'password';

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

    return res.json(buildSessionPayload(session));
  } catch (error) {
    return res.status(401).json({ message: error.message || 'Failed to create backend session.' });
  }
});

router.get('/session', (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const session = getSession(token);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    return res.json(buildSessionPayload(session));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/profile', (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const payload = decodeJwtPayload(token);
    const email = req.query.email || payload.email;
    const uid = req.query.uid || payload.user_id || payload.sub || email;
    const user = getUser({ uid, email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
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
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put('/profile', (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const payload = decodeJwtPayload(token);
    const email = req.body.email || payload.email;
    const uid = req.body.uid || payload.user_id || payload.sub || email;
    if (!uid || !email) {
      return res.status(400).json({ message: 'uid and email are required.' });
    }

    const existing = getUser({ uid, email }) || upsertUser({ uid, email, name: req.body.name, provider: req.body.provider });
    const next = upsertUser({
      uid,
      email,
      name: req.body.name || existing.name,
      provider: req.body.provider || existing.authProviders?.[0] || 'password',
    });

    if (Array.isArray(req.body.interests)) next.interests = req.body.interests;
    if (Array.isArray(req.body.regions)) next.regions = req.body.regions;
    if (typeof req.body.onboardingCompleted === 'boolean') next.onboardingCompleted = req.body.onboardingCompleted;

    return res.json({
      _id: next.uid,
      firebaseUid: next.uid,
      name: next.name,
      email: next.email,
      role: next.role,
      preferences: next.interests,
      authProviders: next.authProviders,
      onboardingCompleted: next.onboardingCompleted,
      regions: next.regions,
      notifications: next.notifications,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
