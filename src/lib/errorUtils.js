/**
 * Sanitizes technical error messages into simple, professional notifications.
 * Removes brand names and technical jargon.
 */
export const getFriendlyErrorMessage = (error) => {
  if (!error) return "";
  const msg = typeof error === 'string' ? error : error.message || String(error);
  
  // Authentication Errors
  if (msg.includes('auth/invalid-email')) return "Please enter a valid email address.";
  if (msg.includes('auth/user-not-found') || msg.includes('auth/wrong-password')) return "Invalid email or password.";
  if (msg.includes('auth/email-already-in-use')) return "This email is already registered.";
  if (msg.includes('auth/weak-password')) return "Password must be at least 6 characters.";
  if (msg.includes('auth/popup-closed-by-user')) return "Authentication was cancelled.";
  if (msg.includes('auth/too-many-requests')) return "Access temporarily locked due to many attempts. Try again later.";
  
  // Database / Permission Errors
  if (msg.includes('permission-denied')) return "You do not have permission for this action.";
  if (msg.includes('network-request-failed')) return "Network error. Please check your connection.";
  
  // Generic cleanup
  let cleanMsg = msg.replace('Firebase: ', '').replace(/\(.*\)/, '').trim();
  
  // Default fallback if cleanup results in technical jargon
  if (cleanMsg.length > 60 || cleanMsg.includes('/') || cleanMsg.includes('_')) {
    return "An unexpected error occurred. Please try again.";
  }

  return cleanMsg || "Something went wrong.";
};
