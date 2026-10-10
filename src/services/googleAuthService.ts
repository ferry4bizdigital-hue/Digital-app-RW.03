import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User as FirebaseUser,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Reuse existing app instance if available
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Google Drive Scopes
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/drive.file');

// In-memory token cache (NEVER in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let currentGoogleUser: FirebaseUser | null = null;
let isSigningIn = false;

type AuthChangeListener = (user: FirebaseUser | null, token: string | null) => void;
const listeners: Set<AuthChangeListener> = new Set();

function notifyListeners() {
  listeners.forEach(fn => {
    try {
      fn(currentGoogleUser, cachedAccessToken);
    } catch (err) {
      console.error('Error in google auth listener:', err);
    }
  });
}

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: FirebaseUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
    currentGoogleUser = user;
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
    notifyListeners();
  });
};

export const subscribeGoogleAuth = (listener: AuthChangeListener): (() => void) => {
  listeners.add(listener);
  listener(currentGoogleUser, cachedAccessToken);
  return () => {
    listeners.delete(listener);
  };
};

export const googleSignIn = async (): Promise<{ user: FirebaseUser; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses dari Google Auth');
    }

    cachedAccessToken = credential.accessToken;
    currentGoogleUser = result.user;
    notifyListeners();
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getCurrentGoogleUser = (): FirebaseUser | null => {
  return currentGoogleUser;
};

export const isGoogleConnected = (): boolean => {
  return !!cachedAccessToken && !!currentGoogleUser;
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  currentGoogleUser = null;
  notifyListeners();
};
