import { auth } from './firebase';
import { signInWithRedirect, signInWithPopup, GoogleAuthProvider, signOut, UserCredential } from 'firebase/auth';

const googleProvider = new GoogleAuthProvider();
const isDev = process.env.NODE_ENV === 'development';

export async function signInWithGoogle(): Promise<UserCredential | void> {
  if (isDev) {
    // Popup in dev (redirect doesn't work with CRA dev server)
    return signInWithPopup(auth, googleProvider);
  } else {
    // Redirect in prod (cleaner UX)
    await signInWithRedirect(auth, googleProvider);
  }
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}
