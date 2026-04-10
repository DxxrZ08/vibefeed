import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { mapDocSnapshot, normalizePost, sanitizePostInput } from '../../utils/firestoreTransforms';

const postsCollection = collection(db, 'posts');

const buildPostsQuery = ({ pageSize = 6, cursor = null } = {}) => {
  const constraints = [];

  constraints.push(orderBy('createdAt', 'desc'));

  if (cursor) {
    constraints.push(startAfter(cursor));
  }

  constraints.push(limit(pageSize + 1));

  return query(postsCollection, ...constraints);
};

export const getPosts = async ({ category = 'all', pageSize = 6, cursor = null } = {}) => {
  const snapshot = await getDocs(buildPostsQuery({ pageSize: pageSize * 4, cursor }));
  const docs = snapshot.docs;
  const normalizedDocs = docs
    .map((postDoc) => normalizePost(mapDocSnapshot(postDoc)))
    .filter((post) => category === 'all' || post.category === category);
  const pageDocs = normalizedDocs.slice(0, pageSize);
  const consumedDocs = docs.slice(0, Math.min(docs.length, Math.max(pageDocs.length, 1)));

  return {
    posts: pageDocs,
    nextCursor: docs.length > consumedDocs.length ? docs[consumedDocs.length - 1] : null,
    hasMore: docs.length > consumedDocs.length,
  };
};

export const subscribeRecentPosts = ({ category = 'all', pageSize = 6 } = {}, onNext, onError) => {
  const constraints = [orderBy('createdAt', 'desc'), limit(pageSize * 4)];

  return onSnapshot(
    query(postsCollection, ...constraints),
    (snapshot) => {
      const posts = snapshot.docs
        .map((postDoc) => normalizePost(mapDocSnapshot(postDoc)))
        .filter((post) => category === 'all' || post.category === category)
        .slice(0, pageSize);
      onNext(posts);
    },
    onError
  );
};

export const createPost = async ({ input, currentUser }) => {
  const payload = sanitizePostInput(input);
  const postRef = await addDoc(postsCollection, {
    ...payload,
    authorId: currentUser.uid,
    authorName: currentUser.displayName || currentUser.email || 'Admin',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const snapshot = await getDoc(postRef);
  return normalizePost(mapDocSnapshot(snapshot));
};

export const updatePost = async (postId, input) => {
  const payload = sanitizePostInput(input);
  const postRef = doc(db, 'posts', postId);
  await updateDoc(postRef, {
    ...payload,
    updatedAt: serverTimestamp(),
  });

  const snapshot = await getDoc(postRef);
  return normalizePost(mapDocSnapshot(snapshot));
};

export const deletePost = async (postId) => {
  await deleteDoc(doc(db, 'posts', postId));
};
