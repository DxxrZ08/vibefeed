import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, facebookProvider, googleProvider, isFirebaseConfigured } from '../../firebase';
import { resolveUserRole } from '../../utils/roleUtils';

const ensureFirebaseReady = () => {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured yet. Add your real VITE_FIREBASE_* values in the project .env file.');
  }
};

const buildUserProfile = (user, existingData = {}, fallbackName = 'Reader') => ({
  name: user.displayName || existingData.name || fallbackName,
  email: user.email || existingData.email || '',
  role: resolveUserRole({ email: user.email, existingRole: existingData.role }),
  onboardingCompleted: existingData.onboardingCompleted ?? false,
  onboardingSkipped: existingData.onboardingSkipped ?? false,
  interests: existingData.interests ?? [],
  regions: existingData.regions?.length ? existingData.regions : ['us'],
  notifications: existingData.notifications ?? [],
  photoURL: user.photoURL || existingData.photoURL || '',
  createdAt: existingData.createdAt || serverTimestamp(),
  updatedAt: serverTimestamp(),
});

export const buildLocalUserProfile = (user, existingData = {}, fallbackName = 'Reader') => ({
  name: user.displayName || existingData.name || fallbackName,
  email: user.email || existingData.email || '',
  role: resolveUserRole({ email: user.email, existingRole: existingData.role }),
  onboardingCompleted: existingData.onboardingCompleted ?? false,
  onboardingSkipped: existingData.onboardingSkipped ?? false,
  interests: existingData.interests ?? [],
  regions: existingData.regions?.length ? existingData.regions : ['us'],
  notifications: existingData.notifications ?? [],
  photoURL: user.photoURL || existingData.photoURL || '',
  createdAt: existingData.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  profileSyncState: 'local-fallback',
});

export const ensureUserProfile = async (user, fallbackName = 'Reader') => {
  ensureFirebaseReady();

  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);
  const existingData = snapshot.exists() ? snapshot.data() : {};
  const nextProfile = buildUserProfile(user, existingData, fallbackName);

  await setDoc(userRef, nextProfile, { merge: true });

  const refreshedSnapshot = await getDoc(userRef);
  return refreshedSnapshot.data();
};

export const ensureUserProfileSafe = async (user, fallbackName = 'Reader') => {
  try {
    const profile = await ensureUserProfile(user, fallbackName);
    return {
      ...profile,
      profileSyncState: 'firestore',
    };
  } catch (error) {
    console.error('Falling back to local profile because Firestore sync failed:', error);
    return buildLocalUserProfile(user, {}, fallbackName);
  }
};

export const registerWithEmail = async ({ name, email, password }) => {
  ensureFirebaseReady();

  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: name });
  const profile = await ensureUserProfileSafe(credential.user, name);

  return { credential, profile };
};

export const loginWithEmail = async ({ email, password }) => {
  ensureFirebaseReady();

  const credential = await signInWithEmailAndPassword(auth, email, password);
  const profile = await ensureUserProfileSafe(credential.user, credential.user.displayName || 'Reader');

  return { credential, profile };
};

export const loginWithGooglePopup = async () => {
  ensureFirebaseReady();

  const credential = await signInWithPopup(auth, googleProvider);
  const profile = await ensureUserProfileSafe(credential.user, 'Google User');

  return { credential, profile };
};

export const loginWithFacebookPopup = async () => {
  ensureFirebaseReady();

  const credential = await signInWithPopup(auth, facebookProvider);
  const profile = await ensureUserProfileSafe(credential.user, 'Facebook User');

  return { credential, profile };
};

export const logoutCurrentUser = async () => {
  await signOut(auth);
};

export const fetchUserProfile = async (uid) => {
  try {
    const userRef = doc(db, 'users', uid);
    const snapshot = await getDoc(userRef);
    return snapshot.exists() ? snapshot.data() : null;
  } catch (error) {
    console.error('Unable to fetch Firestore user profile:', error);
    return null;
  }
};

export const subscribeToAuth = (callback) => onAuthStateChanged(auth, callback);
