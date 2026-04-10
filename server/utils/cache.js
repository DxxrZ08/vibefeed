const cache = new Map();

const get = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.value;
};

const set = (key, value, ttlMs = 5 * 60 * 1000) => {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
};

module.exports = { get, set };
