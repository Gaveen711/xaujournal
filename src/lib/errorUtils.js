/**
 * Sanitizes technical error messages into simple, professional notifications.
 * Removes brand names and technical jargon.
 */
export const getFriendlyErrorMessage = (error) => {
  if (!error) return "";
  const msg = typeof error === 'string' ? error : error.message || String(error);
  
  // Authentication Errors
  if (msg.includes('auth/invalid-email')) return "Please enter a valid email address.";
  if (msg.includes('auth/user-not-found') || msg.includes('auth/wrong-password') || msg.includes('auth/invalid-credential')) {
    return "The email or password you entered was not found. Please try again.";
  }
  if (msg.includes('auth/email-already-in-use')) return "This email is already registered.";
  if (msg.includes('auth/weak-password')) return "Password must be at least 6 characters.";
  if (msg.includes('auth/popup-closed-by-user')) return "Authentication was cancelled.";
  if (msg.includes('auth/popup-blocked')) return "Popup was blocked by your browser. Please allow popups for this site and try again.";
  if (msg.includes('auth/unauthorized-domain')) return "This domain is not authorized for sign-in. Please contact support.";
  if (msg.includes('auth/too-many-requests')) return "Access temporarily locked due to many attempts. Try again later.";
  
  // Database / Permission Errors
  if (msg.includes('permission-denied')) return "You do not have permission for this action.";
  if (msg.includes('network-request-failed')) return "Network error. Please check your connection.";
  
  // Generic cleanup — expose the Firebase error code for easier debugging
  let cleanMsg = msg.replace('Firebase: ', '').trim();
  // Extract just the error code if present (e.g. auth/some-error)
  const codeMatch = msg.match(/\((auth\/[\w-]+)\)/);
  if (codeMatch) return `Sign-in error: ${codeMatch[1]}`;

  if (cleanMsg.length > 80) {
    return "An unexpected error occurred. Please try again.";
  }

  return cleanMsg || "Something went wrong.";
};
