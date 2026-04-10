import {
  buildLocalUserProfile,
  ensureUserProfileSafe,
  fetchUserProfile,
  loginWithEmail,
  loginWithFacebookPopup,
  loginWithGooglePopup,
  logoutCurrentUser,
  registerWithEmail,
  subscribeToAuth,
} from '../services/firebase/authService';
import { isAdminRole } from '../utils/roleUtils';

export const getFriendlyAuthError = (error) => {
  if (!error?.code) {
    return error?.message || 'Something went wrong. Please try again.';
  }

  const messages = {
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/invalid-api-key': 'Your Firebase API key is invalid. Check the project configuration.',
    'auth/app-not-authorized': 'This app is not authorized in Firebase yet. Verify your Firebase project setup.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Invalid email or password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password must be at least 6 characters long.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/unauthorized-domain': 'This domain is not authorized in Firebase Authentication.',
    'auth/popup-closed-by-user': 'The sign-in popup was closed before completing sign-in.',
    'auth/popup-blocked': 'Your browser blocked the sign-in popup. Please allow popups and try again.',
    'auth/account-exists-with-different-credential': 'This email is already linked with a different sign-in method.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled in your Firebase project.',
    'auth/configuration-not-found': 'Firebase Authentication is not fully configured for this project yet.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
  };

  return messages[error.code] || error.message || 'Authentication failed. Please try again.';
};

export const registerUser = async ({ name, email, password }) => registerWithEmail({ name, email, password });
export const loginUser = async ({ email, password }) => loginWithEmail({ email, password });
export const loginWithGoogle = async () => loginWithGooglePopup();
export const loginWithFacebook = async () => loginWithFacebookPopup();
export const logoutUser = async () => logoutCurrentUser();
export const subscribeToAuthState = (callback) => subscribeToAuth(callback);
export const syncUserProfile = async (user, fallbackName) => ensureUserProfileSafe(user, fallbackName);
export const getUserProfile = async (uid) => fetchUserProfile(uid);
export const userIsAdmin = (profile) => isAdminRole(profile?.role);
export const buildFallbackUserProfile = (user, existingData, fallbackName) =>
  buildLocalUserProfile(user, existingData, fallbackName);
