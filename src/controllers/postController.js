import { createPost, deletePost, getPosts, subscribeRecentPosts, updatePost } from '../services/firebase/postService';
import { isAdminRole } from '../utils/roleUtils';

const validatePostInput = (input) => {
  if (!String(input.title || '').trim()) {
    throw new Error('Title is required.');
  }

  if (!String(input.content || '').trim()) {
    throw new Error('Content is required.');
  }
};

const ensureAdmin = (userData) => {
  if (!isAdminRole(userData?.role)) {
    throw new Error('Only admins can manage posts.');
  }
};

export const listPosts = async ({ category = 'all', pageSize = 6, cursor = null } = {}) =>
  getPosts({ category, pageSize, cursor });

export const watchRecentPosts = ({ category = 'all', pageSize = 6 } = {}, onNext, onError) =>
  subscribeRecentPosts({ category, pageSize }, onNext, onError);

export const createManagedPost = async ({ input, currentUser, userData }) => {
  ensureAdmin(userData);
  validatePostInput(input);
  return createPost({ input, currentUser });
};

export const updateManagedPost = async ({ postId, input, userData }) => {
  ensureAdmin(userData);
  validatePostInput(input);
  return updatePost(postId, input);
};

export const deleteManagedPost = async ({ postId, userData }) => {
  ensureAdmin(userData);
  return deletePost(postId);
};
