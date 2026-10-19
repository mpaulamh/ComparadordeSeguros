import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
} from 'firebase/firestore';
import { auth, googleProvider, db, handleFirestoreError, OperationType } from '../firebase';

export type UserRole = 'admin' | 'asesor';
export type UserStatus = 'active' | 'suspended';

export interface UserProfileData {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  lastLoginAt: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfileData | null;
  role: UserRole | null;
  isAdmin: boolean;
  isSuspended: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  logAuditEvent: (action: string, details: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Bootstrapped admin email provided in metadata
const BOOTSTRAP_ADMIN_EMAIL = 'mpaulamh@gmail.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to record audit events
  const logAuditEvent = async (action: string, details: string) => {
    if (!auth.currentUser) return;
    const path = 'audit_logs';
    try {
      await addDoc(collection(db, path), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email || 'sin-email',
        action,
        details,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Audit log write error:', err);
      // Don't crash user flow if audit logging fails
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async currentUser => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          let userSnap;
          try {
            userSnap = await getDoc(userDocRef);
          } catch (e) {
            handleFirestoreError(e, OperationType.GET, `users/${currentUser.uid}`);
          }

          const isBootstrapAdmin = currentUser.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();

          if (userSnap && userSnap.exists()) {
            const data = userSnap.data() as UserProfileData;
            const updatedRole = isBootstrapAdmin ? 'admin' : data.role || 'asesor';
            
            // Sync last login
            const updatedProfile: UserProfileData = {
              ...data,
              role: updatedRole,
              displayName: currentUser.displayName || data.displayName || 'Asesor BN',
              photoURL: currentUser.photoURL || data.photoURL || '',
              lastLoginAt: new Date().toISOString(),
            };

            await updateDoc(userDocRef, {
              lastLoginAt: updatedProfile.lastLoginAt,
              role: updatedRole,
            });

            // Ensure admin marker exists if admin
            if (updatedRole === 'admin') {
              try {
                await setDoc(doc(db, 'admins', currentUser.uid), {
                  uid: currentUser.uid,
                  email: currentUser.email,
                  createdAt: new Date().toISOString(),
                });
              } catch (e) {
                // Marker might already exist
              }
            }

            setProfile(updatedProfile);
          } else {
            // New user registration
            const assignedRole: UserRole = isBootstrapAdmin ? 'admin' : 'asesor';
            const newProfile: UserProfileData = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || 'Asesor BN',
              photoURL: currentUser.photoURL || '',
              role: assignedRole,
              status: 'active',
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
            };

            try {
              await setDoc(userDocRef, newProfile);
            } catch (e) {
              handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.uid}`);
            }

            if (assignedRole === 'admin') {
              try {
                await setDoc(doc(db, 'admins', currentUser.uid), {
                  uid: currentUser.uid,
                  email: currentUser.email,
                  createdAt: new Date().toISOString(),
                });
              } catch (e) {
                // admin marker set attempt
              }
            }

            setProfile(newProfile);
          }

          await logAuditEvent('INICIO_SESION', `Usuario ${currentUser.email} inició sesión.`);
        } catch (error) {
          console.error('Error synchronizing user profile:', error);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  };

  const logout = async () => {
    if (user) {
      await logAuditEvent('CIERRE_SESION', `Usuario ${user.email} cerró sesión.`);
    }
    await signOut(auth);
    setProfile(null);
  };

  const role = profile?.role || null;
  const isAdmin = role === 'admin';
  const isSuspended = profile?.status === 'suspended';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isAdmin,
        isSuspended,
        loading,
        signInWithGoogle,
        logout,
        logAuditEvent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
