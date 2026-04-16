import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  buildFallbackUserProfile,
  getFriendlyAuthError,
  getUserProfile,
  loginUser,
  loginWithGoogle,
  logoutUser,
  registerUser,
  subscribeToAuthState,
  syncUserProfile,
  userIsAdmin,
} from '../controllers/authController';

const AuthContext = createContext();
const AUTH_INIT_TIMEOUT_MS = 6000;

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUserData = async (uid) => {
    if (!uid) {
      setUserData(null);
      return null;
    }

    try {
      const refreshedData = await getUserProfile(uid);
      setUserData(refreshedData);
      return refreshedData;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  const signup = async (email, password, name = 'Reader') => {
    const result = await registerUser({ name, email, password });
    setCurrentUser(result.credential.user);
    setUserData(result.profile);
    return result;
  };

  const login = async (email, password) => {
    const result = await loginUser({ email, password });
    setCurrentUser(result.credential.user);
    setUserData(result.profile);
    return result;
  };

  const loginWithGoogleProvider = async () => {
    const result = await loginWithGoogle();
    setCurrentUser(result.credential.user);
    setUserData(result.profile);
    return result;
  };

  const logout = async () => {
    setUserData(null);
    await logoutUser();
  };

  const hasCompletedOnboarding = () => userData?.onboardingCompleted === true;

  const updateLocalUserData = (updates = {}) => {
    setUserData((previous) => ({
      ...(previous || {}),
      ...updates,
    }));
  };

  const withTimeout = (promise, timeoutMs, fallbackValue) =>
    Promise.race([
      promise,
      new Promise((resolve) => {
        window.setTimeout(() => resolve(fallbackValue), timeoutMs);
      }),
    ]);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (user) => {
      try {
        if (user) {
          setCurrentUser(user);
          const fallbackProfile = buildFallbackUserProfile(user, {}, user.displayName || 'Reader');
          const profile = await withTimeout(
            syncUserProfile(user, user.displayName || 'Reader'),
            AUTH_INIT_TIMEOUT_MS,
            fallbackProfile
          );
          setUserData(profile || fallbackProfile);
        } else {
          setCurrentUser(null);
          setUserData(null);
        }
      } catch (error) {
        console.error('Error handling auth state change:', error);
        if (user) {
          setUserData(buildFallbackUserProfile(user, {}, user.displayName || 'Reader'));
        }
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    isAdmin: userIsAdmin(userData),
    signup,
    login,
    loginWithGoogle: loginWithGoogleProvider,
    logout,
    hasCompletedOnboarding,
    updateLocalUserData,
    refreshUserData: () => (currentUser ? refreshUserData(currentUser.uid) : Promise.resolve(null)),
    getAuthErrorMessage: getFriendlyAuthError,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};
