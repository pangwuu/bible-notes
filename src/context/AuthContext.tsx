import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, onSnapshot, getDoc, type Unsubscribe } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import type { UserProfile, NoteVisibility } from '../types/user';

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let unsubscribeSnapshot: Unsubscribe | null = null;

    // Listen for Firebase Auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      // Clean up previous Firestore snapshot listener if active
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (firebaseUser) {
        setUser(firebaseUser);

        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);

          // Attach real-time snapshot listener to users/{uid}
          unsubscribeSnapshot = onSnapshot(
            userDocRef,
            (docSnap) => {
              if (docSnap.exists()) {
                const data = docSnap.data();
                const defaultVis: NoteVisibility =
                  data.default_visibility || data.settings?.default_visibility || 'friends';
                const preferredTrans: any =
                  data.preferred_translation || data.settings?.preferred_translation || 'ESV';

                const normalizedProfile: UserProfile = {
                  id: firebaseUser.uid,
                  uid: firebaseUser.uid,
                  email: firebaseUser.email || data.email || '',
                  username: data.username || '',
                  display_name: data.display_name || data.full_name || firebaseUser.displayName || '',
                  full_name: data.full_name || data.display_name || firebaseUser.displayName || '',
                  default_visibility: defaultVis,
                  preferred_translation: preferredTrans,
                  settings: {
                    default_visibility: defaultVis,
                    custom_esv_api_key: data.settings?.custom_esv_api_key || data.custom_esv_api_key || '',
                    preferred_translation: preferredTrans,
                  },
                  custom_esv_api_key: data.custom_esv_api_key || data.settings?.custom_esv_api_key || '',
                  created_at: data.created_at,
                  updated_at: data.updated_at,
                };

                setProfile(normalizedProfile);
              } else {
                // If doc doesn't exist yet (e.g. registration sequence in flight),
                // create a temporary fallback profile from Firebase Auth user info
                setProfile({
                  id: firebaseUser.uid,
                  uid: firebaseUser.uid,
                  email: firebaseUser.email || '',
                  username: '',
                  display_name: firebaseUser.displayName || '',
                  full_name: firebaseUser.displayName || '',
                  default_visibility: 'friends',
                  settings: { default_visibility: 'friends' },
                  created_at: null,
                  updated_at: null,
                });
              }
              setLoading(false);
            },
            (error) => {
              console.warn('[AuthContext] Firestore profile snapshot error:', error);
              setLoading(false);
            }
          );
        } catch (error) {
          console.warn('[AuthContext] Failed to setup profile listener:', error);
          setLoading(false);
        }
      } else {
        // User is signed out
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
      unsubscribeAuth();
    };
  }, []);

  const signOut = async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('[AuthContext] Error during signOut:', error);
      throw error;
    }
  };

  const refreshProfile = async (): Promise<void> => {
    if (!auth.currentUser) return;
    try {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const defaultVis: NoteVisibility =
          data.default_visibility || data.settings?.default_visibility || 'friends';
        const preferredTrans: any =
          data.preferred_translation || data.settings?.preferred_translation || 'ESV';

        setProfile({
          id: auth.currentUser.uid,
          uid: auth.currentUser.uid,
          email: auth.currentUser.email || data.email || '',
          username: data.username || '',
          display_name: data.display_name || data.full_name || auth.currentUser.displayName || '',
          full_name: data.full_name || data.display_name || auth.currentUser.displayName || '',
          default_visibility: defaultVis,
          preferred_translation: preferredTrans,
          settings: {
            default_visibility: defaultVis,
            custom_esv_api_key: data.settings?.custom_esv_api_key || data.custom_esv_api_key || '',
            preferred_translation: preferredTrans,
          },
          custom_esv_api_key: data.custom_esv_api_key || data.settings?.custom_esv_api_key || '',
          created_at: data.created_at,
          updated_at: data.updated_at,
        });
      }
    } catch (error) {
      console.warn('[AuthContext] refreshProfile error:', error);
    }
  };

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      profile,
      loading,
      signOut,
      refreshProfile,
    }),
    [user, profile, loading]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
