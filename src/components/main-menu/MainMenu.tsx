import React, { useMemo, useState } from 'react';
import { BookOpen, ChevronRight, Coffee, Flame, LogIn, LogOut, Radio, ScrollText, Settings, Sparkles, Swords, Trophy, User, UserRound } from 'lucide-react';
import type { AuthTab } from './AuthModal';
import BackgroundShell from './BackgroundShell';
import { avatarSrc } from '../../data/avatars';
import type { UserProfile } from '../../utils/userProfile';

interface MainMenuProps {
  isMember: boolean;
  profile: UserProfile | null;
  streak: number;
  onSelectMode: (mode: 'old_testament' | 'gospels' | 'new_testament' | 'revelation' | 'alpha_omega' | 'live_group') => void;
  onOpenAuth: (tab?: AuthTab) => void;
  onOpenProfile: () => void;
  onOpenDaily: () => void;
  onOpenFurnace: () => void;
  onLogout: () => Promise<void>;
}

type MenuItemId =
  | 'start_old_testament'
  | 'start_gospels'
  | 'start_new_testament'
  | 'start_revelation'
  | 'start_alpha_omega'
  | 'start_live_group'
  | 'how'
  | 'settings'
  | 'credits';

const MainMenu: React.FC<MainMenuProps> = ({ isMember, profile, streak, onSelectMode, onOpenAuth, onOpenProfile, onOpenDaily, onOpenFurnace, onLogout }) => {
  const [activeId, setActiveId] = useState<MenuItemId>('start_old_testament');
  const [panel, setPanel] = useState<null | 'how' | 'settings' | 'credits'>(null);
  const [tab, setTab] = useState<'libraries' | 'live'>('libraries');

  const items = useMemo(() => {
    const base: { id: MenuItemId; label: string; icon: React.ReactNode }[] = [
      { id: 'start_old_testament', label: 'Old Testament Library', icon: <BookOpen size={18} /> },
      { id: 'start_gospels', label: 'The Gospels Library', icon: <BookOpen size={18} /> },
      { id: 'start_new_testament', label: 'New Testament Library', icon: <BookOpen size={18} /> },
      { id: 'start_revelation', label: 'Revelation Library', icon: <ScrollText size={18} /> },
      { id: 'start_alpha_omega', label: 'Alpha and Omega Library', icon: <Sparkles size={18} /> },
    ];

    return base;
  }, [isMember]);

  const runAction = async (id: MenuItemId) => {
    if (id === 'start_old_testament') onSelectMode('old_testament');
    else if (id === 'start_gospels') onSelectMode('gospels');
    else if (id === 'start_new_testament') onSelectMode('new_testament');
    else if (id === 'start_revelation') onSelectMode('revelation');
    else if (id === 'start_alpha_omega') onSelectMode('alpha_omega');
    else if (id === 'start_live_group') onSelectMode('live_group');
    else if (id === 'how') setPanel('how');
    else if (id === 'settings') setPanel('settings');
    else if (id === 'credits') setPanel('credits');
  };

  const onKeyDown = async (e: React.KeyboardEvent) => {
    if (panel) {
      if (e.key === 'Escape') setPanel(null);
      return;
    }

    if (tab === 'live') {
      if (e.key === 'Enter') {
        e.preventDefault();
        onSelectMode('live_group');
      }
      return;
    }

    const index = items.findIndex((x) => x.id === activeId);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = items[(index + 1) % items.length];
      setActiveId(next.id);
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = items[(index - 1 + items.length) % items.length];
      setActiveId(next.id);
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      await runAction(activeId);
    }
  };

  return (
    <BackgroundShell>
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-10" tabIndex={0} onKeyDown={onKeyDown}>
        <div className="flex items-center justify-end gap-2">
          {isMember ? (
            <>
              {/* Signed-in identity lives here on the home screen: avatar + username, opening the
                  profile to edit. */}
              <button
                type="button"
                onClick={onOpenProfile}
                className="group inline-flex items-center gap-2 border border-transparent py-1 pl-1 pr-3 transition-colors hover:border-iron-700"
              >
                {(() => {
                  const src = avatarSrc(profile?.avatarId);
                  return src ? (
                    <img
                      src={src}
                      alt=""
                      className="h-8 w-8 rounded-full border border-gold-500/40 object-cover"
                    />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-iron-700 bg-soot-800 text-ash-600">
                      <UserRound size={16} />
                    </span>
                  );
                })()}
                <span className="font-display text-sm font-semibold uppercase tracking-forge text-ash-300 transition-colors group-hover:text-gold-400">
                  {profile?.username?.trim() || 'Set username'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onLogout()}
                aria-label="Log out"
                className="inline-flex items-center gap-2 border border-iron-700 px-3 py-2 font-display text-xs font-semibold uppercase tracking-forge leading-none text-ash-300 transition-colors hover:border-ember-500 hover:text-ember-400"
              >
                <LogOut size={15} />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onOpenProfile}
                className="inline-flex items-center gap-2 border border-transparent px-4 py-2 font-display text-xs font-semibold uppercase tracking-forge leading-none text-ash-500 transition-colors hover:border-iron-700 hover:text-ember-400"
              >
                <User size={15} />
                Profile
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="inline-flex items-center gap-2 border border-iron-700 px-4 py-2 font-display text-xs font-semibold uppercase tracking-forge leading-none text-ash-300 transition-colors hover:border-ember-500 hover:text-ember-400"
              >
                <LogIn size={15} />
                Login
              </button>
            </>
          )}
        </div>

        <div className="mt-10 flex flex-1 flex-col items-center justify-center">
          <div className="mb-10 w-full text-center">
            <div className="mb-5 flex justify-center">
              <img
                src="https://images.squarespace-cdn.com/content/63ceec1f6db7d32cd45a7e8f/37b4821c-9b93-4e5c-beb3-943f7f6d02c9/output-onlinegiftools+%282%29.gif?content-type=image%2Fgif"
                alt=""
                className="h-14 w-14 object-contain drop-shadow-[0_0_24px_rgba(255,107,31,0.45)]"
              />
            </div>

            {/* Solid ink, no gradient fill. The heat comes from the background, not the type. */}
            <h1 className="struck text-6xl sm:text-7xl">
              Refiner&apos;s Fire
            </h1>

            <div className="mx-auto mt-5 w-40 rule-fade" />

            <p className="mt-5 text-sm text-ash-500">
              A dramatic Bible challenge, forged in Revelation.
            </p>
          </div>

        {/* Challenges — competitive modes with world leaderboards, given top billing. */}
        <div className="mb-5 grid w-full max-w-3xl gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onOpenDaily}
            className="group flex items-center gap-3 border border-forge-500/50 bg-gradient-to-br from-forge-700/25 to-transparent px-4 py-4 text-left transition-colors hover:border-forge-400"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-forge-400/50 bg-soot-900 text-forge-400">
              <Swords size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-base font-semibold uppercase tracking-forge text-ash-200">
                Daily Challenge
              </span>
              {streak > 0 ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-forge-300">
                  <Flame size={12} /> {streak}-day streak · keep it alive
                </span>
              ) : (
                <span className="block text-xs text-ash-500">Same set for all. New every day.</span>
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenFurnace}
            className="group flex items-center gap-3 border border-forge-500/50 bg-gradient-to-br from-forge-700/25 to-transparent px-4 py-4 text-left transition-colors hover:border-forge-400"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-forge-400/50 bg-soot-900 text-forge-400">
              <Flame size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-base font-semibold uppercase tracking-forge text-ash-200">
                The Furnace
              </span>
              <span className="block text-xs text-ash-500">Survival. How far can you endure?</span>
            </span>
          </button>
        </div>

        {/* Tabs as struck plates on a rail, not pills in a tray. The active one is lit from below. */}
        <div className="mb-5 grid w-full max-w-3xl grid-cols-2 border-b border-iron-800">
          <button
            type="button"
            onClick={() => setTab('libraries')}
            className={`group inline-flex items-center justify-center gap-2 border-b-2 px-4 py-3 font-display text-sm font-semibold uppercase tracking-forge transition-colors ${
              tab === 'libraries'
                ? 'border-ember-500 text-ash-200'
                : 'border-transparent text-ash-600 hover:text-ash-400'
            }`}
          >
            <BookOpen size={15} className={tab === 'libraries' ? 'text-ember-400' : ''} />
            Libraries
          </button>
          <button
            type="button"
            onClick={() => setTab('live')}
            className={`group inline-flex items-center justify-center gap-2 border-b-2 px-4 py-3 font-display text-sm font-semibold uppercase tracking-forge transition-colors ${
              tab === 'live'
                ? 'border-ember-500 text-ash-200'
                : 'border-transparent text-ash-600 hover:text-ash-400'
            }`}
          >
            <Radio size={15} className={tab === 'live' ? 'text-ember-400' : ''} />
            Live Group Study
          </button>
        </div>

        {/* Both panels share one grid cell, so the row is always as tall as the taller panel
            and nothing below the tabs moves when you switch between them. */}
        <div className="grid w-full max-w-3xl">
        <div
          className={`[grid-area:1/1] plate w-full self-start p-6 ${
            tab === 'libraries' ? '' : 'invisible'
          }`}
        >
          <div className="stamp mb-4">Select library</div>

          {/* Rows divided by hairlines rather than each floating in its own card. */}
          <div className="divide-y divide-iron-800/70 border-y border-iron-800/70">
            {items.map((item) => {
              const active = item.id === activeId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setActiveId(item.id)}
                  onFocus={() => setActiveId(item.id)}
                  onClick={() => runAction(item.id)}
                  className={`group relative flex w-full items-center justify-between py-4 pl-4 pr-3 text-left transition-colors ${
                    active ? 'bg-ember-700/10' : 'hover:bg-iron-800/40'
                  }`}
                >
                  {/* The heat mark: a hot bar struck down the leading edge of the live row. */}
                  <span
                    className={`absolute inset-y-0 left-0 w-[3px] transition-colors ${
                      active ? 'bg-ember-500' : 'bg-transparent'
                    }`}
                  />

                  <div className="flex items-center gap-3">
                    <span className={active ? 'text-ember-400' : 'text-ash-600'}>{item.icon}</span>
                    <span>
                      <span
                        className={`block font-display text-lg font-semibold uppercase tracking-forge ${
                          active ? 'text-ash-200' : 'text-ash-400'
                        }`}
                      >
                        {item.label}
                      </span>
                      {item.id === 'start_old_testament' && <span className="block text-xs text-ash-600">Law, wisdom, prophets, and foundational passages</span>}
                      {item.id === 'start_gospels' && <span className="block text-xs text-ash-600">Teachings, parables, prayer, and discipleship</span>}
                      {item.id === 'start_new_testament' && <span className="block text-xs text-ash-600">Acts, letters, endurance, and church life</span>}
                      {item.id === 'start_revelation' && <span className="block text-xs text-ash-600">Acts, chapters, and Revelation study runs</span>}
                      {item.id === 'start_alpha_omega' && <span className="block text-xs text-ash-600">A mixed run from Genesis to Revelation</span>}
                      {item.id === 'start_live_group' && <span className="block text-xs text-ash-600">Host a room or join friends in real time</span>}
                    </span>
                  </div>

                  <ChevronRight
                    size={18}
                    className={`shrink-0 transition-all ${
                      active ? 'translate-x-0 text-ember-400' : '-translate-x-1 text-iron-600'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
        <div
          className={`[grid-area:1/1] plate w-full self-start p-10 text-center ${
            tab === 'live' ? '' : 'invisible'
          }`}
        >
          <Radio size={34} className="mx-auto mb-5 text-ember-400 drop-shadow-[0_0_18px_rgba(255,107,31,0.5)]" />

          <h2 className="struck text-4xl">Live Group Study</h2>

          <div className="mx-auto mt-4 w-24 rule-fade" />

          <p className="mx-auto mt-4 max-w-sm text-sm text-ash-500">
            Host a room or join friends with a room code and race through verse challenges together in real time.
          </p>

          <button
            type="button"
            onClick={() => onSelectMode('live_group')}
            className="btn-primary mt-7 inline-flex items-center justify-center gap-2 px-7 py-3 font-display text-sm font-semibold uppercase tracking-forge"
          >
            <Radio size={15} /> Enter Live Study
          </button>
        </div>
        </div>

        {/* Secondary actions read as engraved text on the plate, not as three more buttons. */}
        <div className="mt-8 flex w-full max-w-3xl items-center justify-center gap-6">
          <button
            type="button"
            onClick={() => setPanel('how')}
            className="inline-flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-forge text-ash-600 transition-colors hover:text-ember-400"
          >
            <Trophy size={14} /> How to play
          </button>
          <span className="h-3 w-px bg-iron-700" />
          <button
            type="button"
            onClick={() => setPanel('settings')}
            className="inline-flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-forge text-ash-600 transition-colors hover:text-ember-400"
          >
            <Settings size={14} /> Settings
          </button>
          <span className="h-3 w-px bg-iron-700" />
          <button
            type="button"
            onClick={() => setPanel('credits')}
            className="inline-flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-forge text-ash-600 transition-colors hover:text-ember-400"
          >
            <Flame size={14} /> Credits
          </button>
        </div>

        </div>

        {panel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button type="button" className="absolute inset-0 bg-soot-950/90" onClick={() => setPanel(null)} />
            <div className="plate relative w-full max-w-lg p-7">
              <div className="stamp mb-1">{panel}</div>
              <div className="mb-5 rule-fade" />

              {panel === 'how' && (
                <div className="space-y-3 text-sm text-ash-400">
                  <p>
                    Choose a library, answer what comes, and keep your streak alive. Member accounts
                    unlock saved passages, playlists, and your own quizzes.
                  </p>
                  <p className="text-ash-600">Tip: the arrow keys and Enter work throughout the menu.</p>
                </div>
              )}

              {panel === 'settings' && (
                <div className="text-sm text-ash-500">Settings panel coming soon.</div>
              )}

              {panel === 'credits' && (
                <div className="space-y-5 text-sm text-ash-400">
                  <p>Refiner&apos;s Fire. Built with React and Firebase.</p>
                  <a
                    href="https://buymeacoffee.com/playrefinersfire"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary inline-flex items-center gap-2 px-5 py-3 font-display text-xs font-semibold uppercase tracking-forge"
                  >
                    <Coffee size={15} /> Buy me a coffee
                  </a>
                  <p className="text-xs text-ash-600">
                    If you enjoy the app, your support keeps it going. Thank you.
                  </p>

                  {/* Required attribution for NIV text. */}
                  <div className="border-t border-iron-800 pt-4 text-xs leading-relaxed text-ash-600">
                    Scripture quotations taken from the Holy Bible, New International Version®,
                    NIV®. Copyright © 1973, 1978, 1984 by Biblica, Inc.™ Used by permission. All
                    rights reserved worldwide.
                  </div>
                </div>
              )}

              <div className="mt-7 flex justify-end">
                <button
                  type="button"
                  onClick={() => setPanel(null)}
                  className="border border-iron-700 px-4 py-2 font-display text-xs font-semibold uppercase tracking-forge text-ash-400 transition-colors hover:border-ember-500 hover:text-ember-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </BackgroundShell>
  );
};

export default MainMenu;
