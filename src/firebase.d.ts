declare module './firebase.js' {
  export const auth: import('firebase/auth').Auth;
  export const googleProvider: import('firebase/auth').GoogleAuthProvider;
  export const db: import('firebase/firestore').Firestore;
}
