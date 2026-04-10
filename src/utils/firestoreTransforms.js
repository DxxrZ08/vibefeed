export const mapDocSnapshot = (snapshot) => ({
  id: snapshot.id,
  ...snapshot.data(),
});

export const normalizeTimestamp = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
};

export const normalizePost = (post) => ({
  ...post,
  createdAt: normalizeTimestamp(post.createdAt),
  updatedAt: normalizeTimestamp(post.updatedAt),
});

export const sanitizePostInput = (input = {}) => ({
  title: String(input.title || '').trim(),
  content: String(input.content || '').trim(),
  category: String(input.category || 'general').trim().toLowerCase(),
  imageUrl: String(input.imageUrl || '').trim(),
});

export const getCategoryCounts = (posts = []) =>
  posts.reduce((acc, post) => {
    const category = post.category || 'uncategorized';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});
