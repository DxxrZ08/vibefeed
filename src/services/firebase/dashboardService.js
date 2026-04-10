import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase';
import { getCategoryCounts, mapDocSnapshot, normalizePost } from '../../utils/firestoreTransforms';

export const subscribeDashboardStats = (onNext, onError) => {
  const usersCollection = collection(db, 'users');
  const postsCollection = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));

  let users = [];
  let posts = [];

  const emit = () => {
    onNext({
      totalUsers: users.length,
      totalPosts: posts.length,
      categoriesCount: getCategoryCounts(posts),
      recentPosts: posts.slice(0, 5),
    });
  };

  const unsubscribeUsers = onSnapshot(
    usersCollection,
    (snapshot) => {
      users = snapshot.docs.map(mapDocSnapshot);
      emit();
    },
    onError
  );

  const unsubscribePosts = onSnapshot(
    postsCollection,
    (snapshot) => {
      posts = snapshot.docs.map((postDoc) => normalizePost(mapDocSnapshot(postDoc)));
      emit();
    },
    onError
  );

  return () => {
    unsubscribeUsers();
    unsubscribePosts();
  };
};
