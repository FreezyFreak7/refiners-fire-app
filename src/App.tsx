import React, { useEffect, useState } from 'react';
import { signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import RevelationGame from './components/revelation-game/index';
import MemoryGame from './components/memory-game/GameifiedMemoryGame';
import MainMenu from './components/main-menu/MainMenu';
import AuthModal from './components/main-menu/AuthModal';
import BackgroundShell from './components/main-menu/BackgroundShell';
import { auth } from './utils/firebase';

const App: React.FC = () => {
  const [mode, setMode] = useState<'old_testament' | 'gospels' | 'new_testament' | 'revelation' | 'alpha_omega' | 'live_group' | null>(null);

  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');

  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }

    const a = auth;

    const unsubscribe = onAuthStateChanged(a, (currentUser) => {
      if (currentUser) setUser(currentUser);
      else signInAnonymously(a).catch(console.error);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (email: string, password: string) => {
    if (!auth) throw new Error('Auth unavailable.');
    await signInWithEmailAndPassword(auth, email, password);
  };

  const handleRegister = async (email: string, password: string) => {
    if (!auth) throw new Error('Auth unavailable.');
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
  };

  const isMember = !!user && !user.isAnonymous;

  if (!mode) {
    return (
      <>
        <MainMenu
          isMember={isMember}
          onSelectMode={(m) => setMode(m)}
          onOpenAuth={(tab) => {
            setAuthModalTab(tab || 'login');
            setAuthModalOpen(true);
          }}
          onLogout={handleLogout}
        />

        <AuthModal
          isOpen={authModalOpen}
          initialTab={authModalTab}
          onClose={() => setAuthModalOpen(false)}
          onLogin={handleLogin}
          onRegister={handleRegister}
        />
      </>
    );
  }

  return (
    <BackgroundShell>
      {(mode === 'old_testament' || mode === 'gospels' || mode === 'new_testament' || mode === 'alpha_omega') && (
        <MemoryGame
          onBack={() => setMode(null)}
          isMember={isMember}
          initialSetId={mode}
        />
      )}
      {(mode === 'revelation' || mode === 'live_group') && (
        <RevelationGame
          onBack={() => setMode(null)}
          user={user}
          authLoading={authLoading}
          isMember={isMember}
          initialAppState={mode === 'live_group' ? 'lobby' : 'actSelect'}
        />
      )}
    </BackgroundShell>
  );
};

export default App;