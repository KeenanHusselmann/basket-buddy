// ==========================================
// BasketBuddy - Auth Context
// ==========================================

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../config/firebase';
import { createOrUpdateUserProfile } from '../services/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  isDemo: boolean;
  enableDemoMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo user for when Firebase is not configured
const DEMO_USER = {
  uid: 'demo-user',
  email: 'demo@basketbuddy.na',
  displayName: 'Demo User',
  photoURL: null,
} as unknown as User;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      // Check if demo mode was previously enabled
      const demoEnabled = localStorage.getItem('bb-demo-mode');
      if (demoEnabled === 'true') {
        setUser(DEMO_USER);
        setIsDemo(true);
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false); // unblock the app immediately — don't wait for Firestore
      if (user) {
        // fire-and-forget: profile write must not block the loading state
        createOrUpdateUserProfile(user).catch((e) => {
          console.warn('Failed to create/update user profile:', e);
        });
      }
    });
    return unsubscribe;
  }, []);

  const enableDemoMode = () => {
    setUser(DEMO_USER);
    setIsDemo(true);
    localStorage.setItem('bb-demo-mode', 'true');
  };

  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      enableDemoMode();
      return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      if (e?.code === 'auth/popup-closed-by-user') return;
      console.error('Google sign-in error:', e);
      throw e;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (!isFirebaseConfigured || !auth) {
      enableDemoMode();
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      console.error('Email sign-in error:', e);
      throw e;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    if (!isFirebaseConfigured || !auth) {
      enableDemoMode();
      return;
    }
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
    } catch (e) {
      console.error('Email sign-up error:', e);
      throw e;
    }
  };

  const logout = async () => {
    if (isDemo) {
      setUser(null);
      setIsDemo(false);
      localStorage.removeItem('bb-demo-mode');
      return;
    }
    if (auth) await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        logout,
        isDemo,
        enableDemoMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
