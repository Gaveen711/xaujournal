import { Link } from 'react-router-dom';
import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth, googleProvider, setPersistence, browserLocalPersistence, browserSessionPersistence } from './firebase.js';
import { getFriendlyErrorMessage } from './lib/errorUtils';

function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      localStorage.setItem('xau-auth-hint', 'true');
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Reset link sent to your email.');
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await signInWithPopup(auth, googleProvider);
      localStorage.setItem('xau-auth-hint', 'true');
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background selection:bg-primary/30">
      <div className="w-full max-w-[400px] animate-in fade-in slide-in-from-bottom-12 duration-1000 ease-[var(--spring-bounce)]">

        {/* Back link */}
        <div className="flex justify-center mb-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
            Back to home
          </Link>
        </div>

        <div className="card-premium p-8 sm:p-10 space-y-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)]">
          {/* Logo & Header */}
          <div className="text-center space-y-4">
            <div className="w-14 h-14 bg-gradient-to-br from-primary to-purple-500 rounded-2xl mx-auto flex items-center justify-center text-white text-xl font-black shadow-xl shadow-primary/30 rotate-3 hover:rotate-0 transition-transform duration-500">
              XAU
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-gradient uppercase tracking-tight">
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </h1>
              <p className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-[0.2em]">
                {isSignUp ? 'Start your xaujournal' : 'Sign in to your journal'}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Google Auth */}
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full h-12 flex items-center justify-center gap-3 bg-muted/40 border border-border/50 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-muted/60 transition-all active:scale-95 disabled:opacity-50 group"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" className="group-hover:rotate-12 transition-transform">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
                <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
              </svg>
              <span>Sign In</span>
            </button>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-[1px] bg-border/30" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">or</span>
              <div className="flex-1 h-[1px] bg-border/30" />
            </div>

            {/* Email Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/60 ml-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder=""
                  required
                  className="input-premium h-12 text-sm font-bold"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/60"> Password</label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      className="text-[9px] font-black text-primary hover:text-primary/70 transition-colors uppercase tracking-widest"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder=""
                  required={!loading}
                  className="input-premium h-12 text-sm font-bold"
                />
              </div>

              {/* Stay Signed In Toggle */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                  <div 
                    onClick={() => setRememberMe(!rememberMe)}
                    className={`w-10 h-5 rounded-full transition-all duration-300 cursor-pointer relative ${rememberMe ? 'bg-primary shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]' : 'bg-muted'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${rememberMe ? 'left-6' : 'left-1'}`} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Stay signed in</span>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[11px] font-bold uppercase tracking-tight animate-in shake-1">
                  {error}
                </div>
              )}

              {message && (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl text-primary text-[11px] font-bold uppercase tracking-tight animate-in fade-in">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full h-12 text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 active:scale-95 transition-all"
              >
                {loading ? 'Authorizing...' : isSignUp ? 'Create New Account' : 'Sign in to Terminal'}
              </button>
            </form>
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
              className="text-[10px] font-black text-muted-foreground/60 hover:text-primary transition-all uppercase tracking-widest"
            >
              {isSignUp ? 'Already a member? Sign in here' : "Need an account? Register here"}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 mt-8 opacity-30">
          <div className="h-[1px] w-8 bg-muted-foreground" />
          <p className="text-[9px] text-center text-muted-foreground uppercase tracking-[0.3em] font-black">
            Secure Node
          </p>
          <div className="h-[1px] w-8 bg-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

export default Login;