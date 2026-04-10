import React, { createContext, useCallback, useContext, useEffect, useState, startTransition } from 'react';
import { collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

const BookmarksContext = createContext();
const LOCAL_BOOKMARKS_KEY = 'vibefeed_local_bookmarks';
const PENDING_SYNC_KEY = 'vibefeed_pending_bookmarks';
const SNAPSHOT_TIMEOUT_MS = 5000;

// eslint-disable-next-line react-refresh/only-export-components
export const useBookmarks = () => useContext(BookmarksContext);

const normalizeBookmark = (article = {}) => ({
  ...article,
  savedAt: article.savedAt || new Date().toISOString(),
});

const getBookmarksStorageKey = (uid) => `${LOCAL_BOOKMARKS_KEY}:${uid || 'guest'}`;
const getPendingSyncStorageKey = (uid) => `${PENDING_SYNC_KEY}:${uid || 'guest'}`;

export const BookmarksProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState([]);

  const loadLocalBookmarks = useCallback((uid = currentUser?.uid) => {
    try {
      const stored = localStorage.getItem(getBookmarksStorageKey(uid));
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading local bookmarks:', error);
      return [];
    }
  }, [currentUser?.uid]);

  const saveLocalBookmarks = useCallback((bookmarkList, uid = currentUser?.uid) => {
    try {
      localStorage.setItem(getBookmarksStorageKey(uid), JSON.stringify(bookmarkList));
    } catch (error) {
      console.error('Error saving local bookmarks:', error);
    }
  }, [currentUser?.uid]);

  const loadPendingSync = useCallback((uid = currentUser?.uid) => {
    try {
      const stored = localStorage.getItem(getPendingSyncStorageKey(uid));
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading pending bookmark sync:', error);
      return [];
    }
  }, [currentUser?.uid]);

  const savePendingSync = useCallback((items, uid = currentUser?.uid) => {
    try {
      localStorage.setItem(getPendingSyncStorageKey(uid), JSON.stringify(items));
    } catch (error) {
      console.error('Error saving pending bookmark sync:', error);
    }
  }, [currentUser?.uid]);

  const addBookmarkToFirestore = useCallback(
    async (article) => {
      if (!currentUser) return;

      const bookmarkRef = doc(db, 'users', currentUser.uid, 'bookmarks', article.id);
      await setDoc(bookmarkRef, {
        ...article,
        savedAt: serverTimestamp(),
      });
    },
    [currentUser]
  );

  const removeBookmarkFromFirestore = useCallback(
    async (articleId) => {
      if (!currentUser) return;

      const bookmarkRef = doc(db, 'users', currentUser.uid, 'bookmarks', articleId);
      await deleteDoc(bookmarkRef);
    },
    [currentUser]
  );

  const syncPendingBookmarks = useCallback(async () => {
    if (!currentUser || !isOnline || pendingSync.length === 0) return;

    const failedItems = [];

    for (const item of pendingSync) {
      try {
        if (item.action === 'add') {
          await addBookmarkToFirestore(item.article);
        } else if (item.action === 'remove') {
          await removeBookmarkFromFirestore(item.articleId);
        }
      } catch (error) {
        console.error('Error syncing bookmark:', error);
        failedItems.push(item);
      }
    }

    setPendingSync(failedItems);
    savePendingSync(failedItems);
  }, [addBookmarkToFirestore, currentUser, isOnline, pendingSync, removeBookmarkFromFirestore, savePendingSync]);

  useEffect(() => {
    const storedPendingSync = loadPendingSync();
    if (storedPendingSync.length) {
      setPendingSync(storedPendingSync);
    }
  }, [loadPendingSync]);

  useEffect(() => {
    savePendingSync(pendingSync);
  }, [pendingSync, savePendingSync]);

  useEffect(() => {
    let unsubscribe = null;
    let timeoutId = null;
    let initialSnapshotResolved = false;

    if (currentUser) {
      const localBookmarks = loadLocalBookmarks();
      const bookmarksRef = collection(db, 'users', currentUser.uid, 'bookmarks');
      const bookmarksQuery = query(bookmarksRef);

      startTransition(() => {
        setBookmarks(localBookmarks);
        setLoading(false);
      });

      timeoutId = window.setTimeout(() => {
        if (!initialSnapshotResolved) {
          const fallbackBookmarks = loadLocalBookmarks();
          setBookmarks(fallbackBookmarks);
          setLoading(false);
        }
      }, SNAPSHOT_TIMEOUT_MS);

      unsubscribe = onSnapshot(
        bookmarksQuery,
        async (snapshot) => {
          initialSnapshotResolved = true;
          window.clearTimeout(timeoutId);
          const remoteBookmarks = snapshot.docs.map((bookmarkDoc) => ({
            id: bookmarkDoc.id,
            ...bookmarkDoc.data(),
          }));

          if (remoteBookmarks.length === 0 && localBookmarks.length > 0 && isOnline) {
            await Promise.all(localBookmarks.map((bookmark) => addBookmarkToFirestore(normalizeBookmark(bookmark))));
            return;
          }

          setBookmarks(remoteBookmarks);
          saveLocalBookmarks(remoteBookmarks);
          setLoading(false);
        },
        (error) => {
          initialSnapshotResolved = true;
          window.clearTimeout(timeoutId);
          console.error('Error loading bookmarks from Firestore:', error);
          const fallbackBookmarks = loadLocalBookmarks();
          setBookmarks(fallbackBookmarks);
          setLoading(false);
        }
      );
    } else {
      const localBookmarks = loadLocalBookmarks(null);
      startTransition(() => {
        setBookmarks(localBookmarks);
        setLoading(false);
      });
    }

    return () => {
      window.clearTimeout(timeoutId);
      if (unsubscribe) unsubscribe();
    };
  }, [addBookmarkToFirestore, currentUser, isOnline, loadLocalBookmarks, saveLocalBookmarks]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (pendingSync.length > 0) {
        void syncPendingBookmarks();
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingSync.length, syncPendingBookmarks]);

  const isBookmarked = useCallback((articleId) => bookmarks.some((bookmark) => bookmark.id === articleId), [bookmarks]);

  const toggleBookmark = async (article) => {
    const normalizedArticle = normalizeBookmark(article);
    const currentlySaved = isBookmarked(normalizedArticle.id);

    if (currentlySaved) {
      const nextBookmarks = bookmarks.filter((bookmark) => bookmark.id !== normalizedArticle.id);
      setBookmarks(nextBookmarks);
      saveLocalBookmarks(nextBookmarks);

      if (currentUser) {
        if (isOnline) {
          try {
            await removeBookmarkFromFirestore(normalizedArticle.id);
          } catch (error) {
            console.error('Error removing bookmark:', error);
            setBookmarks(bookmarks);
            saveLocalBookmarks(bookmarks);
          }
        } else {
          setPendingSync((previous) => [...previous, { action: 'remove', articleId: normalizedArticle.id }]);
        }
      }
    } else {
      const nextBookmarks = [normalizedArticle, ...bookmarks];
      setBookmarks(nextBookmarks);
      saveLocalBookmarks(nextBookmarks);

      if (currentUser) {
        if (isOnline) {
          try {
            await addBookmarkToFirestore(normalizedArticle);
          } catch (error) {
            console.error('Error adding bookmark:', error);
            setBookmarks(bookmarks);
            saveLocalBookmarks(bookmarks);
          }
        } else {
          setPendingSync((previous) => [...previous, { action: 'add', article: normalizedArticle }]);
        }
      }
    }
  };

  const value = {
    bookmarks,
    loading,
    bookmarkCount: bookmarks.length,
    isBookmarked,
    toggleBookmark,
    isOnline,
  };

  return <BookmarksContext.Provider value={value}>{children}</BookmarksContext.Provider>;
};
