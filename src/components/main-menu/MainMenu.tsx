import React, { useMemo, useState } from 'react';
import { BookOpen, Flame, LogIn, LogOut, Radio, ScrollText, Settings, Sparkles, Trophy } from 'lucide-react';
import type { AuthTab } from './AuthModal';
import BackgroundShell from './BackgroundShell';

interface MainMenuProps {
  isMember: boolean;
  onSelectMode: (mode: 'old_testament' | 'gospels' | 'new_testament' | 'revelation' | 'alpha_omega' | 'live_group') => void;
  onOpenAuth: (tab?: AuthTab) => void;
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

const MainMenu: React.FC<MainMenuProps> = ({ isMember, onSelectMode, onOpenAuth, onLogout }) => {
  const [activeId, setActiveId] = useState<MenuItemId>('start_old_testament');
  const [panel, setPanel] = useState<null | 'how' | 'settings' | 'credits'>(null);

  const items = useMemo(() => {
    const base: { id: MenuItemId; label: string; icon: React.ReactNode }[] = [
      { id: 'start_old_testament', label: 'Old Testament Library', icon: <BookOpen size={18} /> },
      { id: 'start_gospels', label: 'The Gospels Library', icon: <BookOpen size={18} /> },
      { id: 'start_new_testament', label: 'New Testament Library', icon: <BookOpen size={18} /> },
      { id: 'start_revelation', label: 'Revelation Library', icon: <ScrollText size={18} /> },
      { id: 'start_alpha_omega', label: 'Alpha and Omega Library', icon: <Sparkles size={18} /> },
      { id: 'start_live_group', label: 'Live Group Study', icon: <Radio size={18} /> },
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
        <div className="flex items-start justify-end">
          {!isMember ? (
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-xs font-black text-slate-200 hover:bg-white/5"
            >
              <LogIn size={16} className="text-orange-300" />
              LOGIN
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onLogout()}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-xs font-black text-slate-200 hover:bg-white/5"
            >
              <LogOut size={16} className="text-orange-300" />
              LOGOUT
            </button>
          )}
        </div>

        <div className="mt-10 flex flex-1 flex-col items-center justify-center">
          <div className="mb-10 w-full text-center">
            <div className="mb-6 flex justify-center">
              <div className="inline-flex items-center justify-center rounded-3xl border border-orange-500/30 bg-black/30 p-5 shadow-2xl backdrop-blur-xl">
                <img
                  src="https://images.squarespace-cdn.com/content/63ceec1f6db7d32cd45a7e8f/37b4821c-9b93-4e5c-beb3-943f7f6d02c9/output-onlinegiftools+%282%29.gif?content-type=image%2Fgif"
                  alt="Fire"
                  className="h-16 w-16 object-contain"
                />
              </div>
            </div>

            <div className="mx-auto w-full max-w-xl">
              <div className="text-center text-5xl sm:text-6xl font-black uppercase tracking-tight bg-gradient-to-r from-orange-300 via-orange-400 to-red-500 bg-clip-text text-transparent">
                Refiner&apos;s Fire
              </div>
            </div>

            <div className="mt-4 text-xs font-black uppercase tracking-[0.35em] text-slate-400">A DRAMATIC BIBLE CHALLENGE, FORGED IN REVELATION.</div>
          </div>

        <div className="w-full max-w-xl rounded-3xl border border-orange-500/20 bg-slate-950/50 p-2 shadow-2xl backdrop-blur-xl">
          <div className="rounded-2xl border border-white/5 bg-black/30 p-6">
            <div className="mb-3 text-xs font-bold uppercase tracking-[0.35em] text-slate-500">SELECT LIBRARY</div>
            <div className="space-y-2">
              {items.map((item) => {
                const active = item.id === activeId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseEnter={() => setActiveId(item.id)}
                    onFocus={() => setActiveId(item.id)}
                    onClick={() => runAction(item.id)}
                    className={`group flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-all ${
                      active
                        ? 'border-orange-500/60 bg-orange-500/10 shadow-[0_0_0_1px_rgba(255,120,60,0.15)]'
                        : 'border-white/5 bg-black/10 hover:border-orange-500/30 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
                          active ? 'border-orange-500/40 bg-orange-500/10 text-orange-300' : 'border-white/10 bg-black/20 text-slate-300'
                        }`}
                      >
                        {item.icon}
                      </div>
                      <div>
                        <div className="font-black text-white">{item.label}</div>
                        {item.id === 'start_old_testament' && <div className="text-xs text-slate-400">Law, wisdom, prophets, and foundational passages</div>}
                        {item.id === 'start_gospels' && <div className="text-xs text-slate-400">Teachings, parables, prayer, and discipleship</div>}
                        {item.id === 'start_new_testament' && <div className="text-xs text-slate-400">Acts, letters, endurance, and church life</div>}
                        {item.id === 'start_revelation' && <div className="text-xs text-slate-400">Acts, chapters, and Revelation study runs</div>}
                        {item.id === 'start_alpha_omega' && <div className="text-xs text-slate-400">A mixed run from Genesis to Revelation</div>}
                        {item.id === 'start_live_group' && <div className="text-xs text-slate-400">Host a room or join friends in real time</div>}
                      </div>
                    </div>

                    <div
                      className={`text-xs font-black uppercase tracking-[0.25em] transition-colors ${
                        active ? 'text-orange-300' : 'text-slate-600 group-hover:text-slate-400'
                      }`}
                    >
                      ENTER
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-8 flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-center">
          <button
            type="button"
            onClick={() => setPanel('how')}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs font-black text-slate-200 hover:bg-white/5"
          >
            <Trophy size={16} className="text-orange-300" />
            HOW TO PLAY
          </button>
          <button
            type="button"
            onClick={() => setPanel('settings')}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs font-black text-slate-200 hover:bg-white/5"
          >
            <Settings size={16} className="text-orange-300" />
            SETTINGS
          </button>
          <button
            type="button"
            onClick={() => setPanel('credits')}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs font-black text-slate-200 hover:bg-white/5"
          >
            <Flame size={16} className="text-orange-300" />
            CREDITS
          </button>
        </div>

        </div>

        {panel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button type="button" className="absolute inset-0 bg-black/80" onClick={() => setPanel(null)} />
            <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950/80 p-6 backdrop-blur-xl">
              <div className="mb-3 text-xs font-black uppercase tracking-[0.35em] text-slate-500">{panel}</div>
              {panel === 'how' && (
                <div className="space-y-3 text-sm text-slate-200">
                  <div className="text-slate-300">
                    Choose a mode, answer questions, and keep your streak alive. Member accounts unlock hidden content.
                  </div>
                  <div className="text-slate-400">Tip: Use the keyboard for a classic menu feel.</div>
                </div>
              )}
              {panel === 'settings' && (
                <div className="text-sm text-slate-300">Settings panel coming soon.</div>
              )}
              {panel === 'credits' && (
                <div className="text-sm text-slate-300">Refiner&apos;s Fire. Built with React + Firebase.</div>
              )}
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setPanel(null)}
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-xs font-black text-slate-200 hover:bg-white/5"
                >
                  CLOSE
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
