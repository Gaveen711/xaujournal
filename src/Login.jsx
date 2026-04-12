import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { auth, googleProvider } from './firebase.js';

function Login() {
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message.replace('Firebase: ', '').replace(/\(.*\)/, '').trim());
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(err.message.replace('Firebase: ', '').replace(/\(.*\)/, '').trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background selection:bg-primary/30">
      <div className="w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        <div className="card-premium p-10 space-y-8 shadow-2xl shadow-primary/5">
          {/* Logo & Header */}
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-purple-400 rounded-xl mx-auto flex items-center justify-center text-white text-xl font-black shadow-lg shadow-primary/20">
              XAU
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-gradient">
                {isSignUp ? 'Join XAU Elite' : 'Welcome to XAU'}
              </h1>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
                Professional Trading Journal
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Google Auth */}
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full h-11 flex items-center justify-center gap-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold hover:bg-muted transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-border/40" />
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Or Secure Login</span>
              <div className="flex-1 h-px bg-border/40" />
            </div>

            {/* Email Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground ml-1">Terminal Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@xau.com"
                  required
                  className="input-premium h-11"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground ml-1">Access Key</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input-premium h-11"
                />
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-[11px] font-bold animate-in shake-1">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full h-11 text-sm font-bold shadow-primary/20"
              >
                {loading ? 'Decrypting Access...' : isSignUp ? 'Initialize Terminal' : 'Access Journal'}
              </button>
            </form>
          </div>

          <div className="text-center">
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
              className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
            >
              {isSignUp ? 'Already authorized? Sign in' : "New User? Create account"}
            </button>
          </div>
        </div>
        
        <p className="text-[10px] text-center text-muted-foreground mt-8 uppercase tracking-[0.2em] font-medium opacity-50">
          Encrypted SECURE ACCESS ONLY
        </p>
      </div>
    </div>
  );
}


export default Login;
