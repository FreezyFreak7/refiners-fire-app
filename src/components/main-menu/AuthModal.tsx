import React, { useEffect, useMemo, useState } from 'react';

export type AuthTab = 'login' | 'register';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: AuthTab;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string) => Promise<void>;
  onGoogle: () => Promise<void>;
}

const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'login',
  onLogin,
  onRegister,
  onGoogle,
}) => {
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTab(initialTab);
    setError(null);
    setSubmitting(false);
  }, [isOpen, initialTab]);

  const canSubmit = useMemo(() => {
    if (!email || !password) return false;
    if (tab === 'register' && password !== confirmPassword) return false;
    return true;
  }, [email, password, confirmPassword, tab]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (tab === 'register' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      if (tab === 'login') await onLogin(email, password);
      else await onRegister(email, password);

      setEmail('');
      setPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err: any) {
      const msg = typeof err?.message === 'string' ? err.message : 'Authentication failed.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await onGoogle();
      onClose();
    } catch (err: unknown) {
      const { code, message } = (err ?? {}) as { code?: string; message?: string };

      switch (code) {
        // Closing the popup is a deliberate "never mind", not a failure to report.
        case 'auth/popup-closed-by-user':
        case 'auth/cancelled-popup-request':
          break;
        case 'auth/popup-blocked':
          setError('Your browser blocked the sign-in popup. Allow popups and try again.');
          break;
        case 'auth/unauthorized-domain':
          setError('Google sign-in is not enabled for this domain yet.');
          break;
        case 'auth/account-exists-with-different-credential':
          setError('That email is already registered with a password. Log in with it instead.');
          break;
        default:
          setError(typeof message === 'string' ? message : 'Google sign-in failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-soot-950/90"
        onClick={onClose}
        aria-label="Close auth modal"
      />

      <div className="relative w-full max-w-md rounded-2xl border border-gold-500/30 bg-soot-900/90 shadow-2xl">
        <div className="flex items-center justify-between border-b border-iron-800 p-4">
          <div className="text-sm font-bold tracking-widest text-ash-200">ACCOUNT</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-xs font-bold text-ash-300 hover:bg-iron-800/40"
          >
            CLOSE
          </button>
        </div>

        <div className="p-4">
          <div className="mb-4 grid grid-cols-2 rounded-xl bg-soot-900/70 p-1">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setError(null);
              }}
              className={`rounded-lg py-2 text-sm font-bold transition-colors ${
                tab === 'login' ? 'btn-primary' : 'text-ash-300 hover:bg-iron-800/40'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setError(null);
              }}
              className={`rounded-lg py-2 text-sm font-bold transition-colors ${
                tab === 'register' ? 'btn-primary' : 'text-ash-300 hover:bg-iron-800/40'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ash-500">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-iron-800 bg-soot-950/60 p-3 text-white outline-none focus:border-gold-500/60"
                placeholder="you@email.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ash-500">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-iron-800 bg-soot-950/60 p-3 text-white outline-none focus:border-gold-500/60"
                placeholder="••••••••"
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {tab === 'register' && (
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ash-500">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-iron-800 bg-soot-950/60 p-3 text-white outline-none focus:border-gold-500/60"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="btn-primary w-full rounded-xl py-3 font-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'PLEASE WAIT…' : tab === 'login' ? 'LOGIN' : 'CREATE ACCOUNT'}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-iron-800/60" />
            <span className="text-xs font-bold tracking-widest text-ash-600">OR</span>
            <div className="h-px flex-1 bg-iron-800/60" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={submitting}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-iron-800 bg-white/95 py-3 font-bold text-slate-800 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
              <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
            </svg>
            {submitting ? 'PLEASE WAIT…' : 'Continue with Google'}
          </button>

          <div className="mt-4 text-center text-xs text-ash-600">
            By continuing, you agree this account system is for gameplay progression.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
