import React, { useEffect, useMemo, useState } from 'react';

export type AuthTab = 'login' | 'register';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: AuthTab;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string) => Promise<void>;
}

const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'login',
  onLogin,
  onRegister,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
        aria-label="Close auth modal"
      />

      <div className="relative w-full max-w-md rounded-2xl border border-orange-500/30 bg-slate-950/80 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div className="text-sm font-bold tracking-widest text-slate-200">ACCOUNT</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-xs font-bold text-slate-300 hover:bg-white/5"
          >
            CLOSE
          </button>
        </div>

        <div className="p-4">
          <div className="mb-4 grid grid-cols-2 rounded-xl bg-black/30 p-1">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setError(null);
              }}
              className={`rounded-lg py-2 text-sm font-bold transition-colors ${
                tab === 'login' ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-white/5'
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
                tab === 'register' ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-400">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white outline-none focus:border-orange-500/60"
                placeholder="you@email.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-400">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white outline-none focus:border-orange-500/60"
                placeholder="••••••••"
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {tab === 'register' && (
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-400">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white outline-none focus:border-orange-500/60"
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
              className="w-full rounded-xl bg-orange-600 py-3 font-black text-white transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'PLEASE WAIT…' : tab === 'login' ? 'LOGIN' : 'CREATE ACCOUNT'}
            </button>
          </form>

          <div className="mt-4 text-center text-xs text-slate-500">
            By continuing, you agree this account system is for gameplay progression.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
