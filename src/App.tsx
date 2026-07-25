import React, { useEffect, useRef, useState } from 'react';
import { signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithCredential, linkWithPopup, type AuthError } from 'firebase/auth';
import RevelationGame from './components/revelation-game/index';
import MemoryGame from './components/memory-game/GameifiedMemoryGame';
import MainMenu from './components/main-menu/MainMenu';
import AuthModal from './components/main-menu/AuthModal';
import BackgroundShell from './components/main-menu/BackgroundShell';
import LaunchAnimation from './components/main-menu/LaunchAnimation';
import ProfilePage from './components/profile/ProfilePage';
import QuizPlayScreen from './components/profile/QuizPlayScreen';
import DailyChallenge from './components/daily/DailyChallenge';
import FurnaceGame from './components/daily/FurnaceGame';
import { auth } from './utils/firebase';
import { subscribeUserProfile, type UserProfile } from './utils/userProfile';
import { subscribeUserStats, type UserStats } from './utils/userStats';
import { fetchSharedQuiz } from './utils/sharedQuiz';
import type { Quiz } from './utils/quiz';

const App: React.FC = () => {
  const [mode, setMode] = useState<'old_testament' | 'gospels' | 'new_testament' | 'revelation' | 'alpha_omega' | 'live_group' | 'profile' | 'daily' | 'furnace' | null>(null);

  const [showLaunch, setShowLaunch] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  // A quiz being played on its own full-screen page — from the profile, or a shared link.
  const [playingQuiz, setPlayingQuiz] = useState<{ quiz: Quiz; byline?: string; fromProfile: boolean } | null>(null);

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

  const handleGoogleAuth = async () => {
    if (!auth) throw new Error('Auth unavailable.');
    const a = auth;
    const provider = new GoogleAuthProvider();
    const current = a.currentUser;

    // Everyone starts as an anonymous user, and live-session seats are keyed by uid, so we link
    // the Google account onto the existing one to keep that uid.
    if (current?.isAnonymous) {
      try {
        const linked = await linkWithPopup(current, provider);
        setUser(linked.user);
        return;
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        if (code !== 'auth/credential-already-in-use' && code !== 'auth/email-already-in-use') throw err;

        // Returning player: the Google account already exists, so linking fails — but the popup
        // we just showed already collected the credential. Reuse it rather than opening a second
        // popup, which browsers block because we are no longer inside the click's user gesture.
        const credential = GoogleAuthProvider.credentialFromError(err as AuthError);
        if (credential) {
          const result = await signInWithCredential(a, credential);
          setUser(result.user);
          return;
        }
      }
    }

    const result = await signInWithPopup(a, provider);
    setUser(result.user);
  };

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
  };

  const isMember = !!user && !user.isAnonymous;

  // Reservation rules block anonymous users from reading the profile, so only subscribe once the
  // user is a real member. Clearing in cleanup (rather than synchronously) means switching
  // accounts can't briefly show the previous user's name.
  useEffect(() => {
    if (!isMember || !user) return;
    const unsubProfile = subscribeUserProfile(user.uid, setProfile, console.error);
    const unsubStats = subscribeUserStats(user.uid, setStats, console.error);
    return () => {
      unsubProfile();
      unsubStats();
      setProfile(null);
      setStats(null);
    };
  }, [isMember, user]);

  // A ?quiz=<id> link opens that shared quiz on its own page. Needs auth (everyone is anon-signed
  // in on load), so it waits for `user`, and runs once.
  const sharedLoadedRef = useRef(false);
  useEffect(() => {
    if (!user || sharedLoadedRef.current) return;
    const shareId = new URLSearchParams(window.location.search).get('quiz');
    if (!shareId) return;
    sharedLoadedRef.current = true;
    fetchSharedQuiz(shareId)
      .then((shared) => {
        if (!shared) return;
        setPlayingQuiz({
          quiz: { id: shared.id, name: shared.name, questions: shared.questions, createdAt: null, updatedAt: null },
          byline: shared.ownerName,
          fromProfile: false,
        });
      })
      .catch(console.error);
  }, [user]);

  const exitQuiz = () => {
    const wasFromProfile = playingQuiz?.fromProfile;
    setPlayingQuiz(null);
    // Drop the ?quiz= param so a refresh doesn't reopen the shared quiz.
    if (window.location.search.includes('quiz=')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    setMode(wasFromProfile ? 'profile' : null);
  };

  if (showLaunch) {
    return <LaunchAnimation onComplete={() => setShowLaunch(false)} />;
  }

  if (playingQuiz) {
    return (
      <BackgroundShell>
        <QuizPlayScreen quiz={playingQuiz.quiz} byline={playingQuiz.byline} onExit={exitQuiz} />
      </BackgroundShell>
    );
  }

  if (!mode) {
    return (
      <>
        <MainMenu
          isMember={isMember}
          profile={profile}
          streak={stats?.currentStreak ?? 0}
          onOpenDaily={() => setMode('daily')}
          onOpenFurnace={() => setMode('furnace')}
          onSelectMode={(m) => setMode(m)}
          onOpenAuth={(tab) => {
            setAuthModalTab(tab || 'login');
            setAuthModalOpen(true);
          }}
          onOpenProfile={() => {
            // Profiles are account-only, so a guest who taps Profile gets the sign-up prompt.
            if (isMember) setMode('profile');
            else {
              setAuthModalTab('register');
              setAuthModalOpen(true);
            }
          }}
          onLogout={handleLogout}
        />

        <AuthModal
          isOpen={authModalOpen}
          initialTab={authModalTab}
          onClose={() => setAuthModalOpen(false)}
          onLogin={handleLogin}
          onRegister={handleRegister}
          onGoogle={handleGoogleAuth}
        />
      </>
    );
  }

  return (
    <BackgroundShell>
      {mode === 'profile' && isMember && user && (
        <ProfilePage
          user={user}
          onBack={() => setMode(null)}
          onPlayQuiz={(quiz) => setPlayingQuiz({ quiz, fromProfile: true })}
        />
      )}
      {mode === 'daily' && (
        <DailyChallenge
          user={user}
          isMember={isMember}
          profile={profile}
          onBack={() => setMode(null)}
          onOpenAuth={() => {
            setMode(null);
            setAuthModalTab('register');
            setAuthModalOpen(true);
          }}
        />
      )}
      {mode === 'furnace' && (
        <FurnaceGame
          user={user}
          isMember={isMember}
          profile={profile}
          onBack={() => setMode(null)}
          onOpenAuth={() => {
            setMode(null);
            setAuthModalTab('register');
            setAuthModalOpen(true);
          }}
        />
      )}
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