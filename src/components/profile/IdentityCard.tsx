import React, { useEffect, useState } from 'react';
import { Check, Pencil, UserRound, X } from 'lucide-react';
import { AVATARS, avatarSrc } from '../../data/avatars';
import { USERNAME_MAX, validateUsername, type UserProfile } from '../../utils/userProfile';

interface IdentityCardProps {
  profile: UserProfile | null;
  fallbackName: string;
  email: string | null;
  onSaveUsername: (username: string) => Promise<void>;
  onSaveAvatar: (avatarId: string) => Promise<void>;
}

const AvatarImage: React.FC<{ id: string | null; size: number }> = ({ id, size }) => {
  const src = avatarSrc(id);
  if (!src) {
    return (
      <div
        className="flex items-center justify-center rounded-full border border-iron-700 bg-soot-800 text-ash-600"
        style={{ width: size, height: size }}
      >
        <UserRound size={size * 0.5} />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className="rounded-full border border-gold-500/40 object-cover"
      style={{ width: size, height: size }}
    />
  );
};

const IdentityCard: React.FC<IdentityCardProps> = ({
  profile,
  fallbackName,
  email,
  onSaveUsername,
  onSaveAvatar,
}) => {
  const [editingName, setEditingName] = useState(false);
  const [draft, setDraft] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [pickingAvatar, setPickingAvatar] = useState(false);
  const [busy, setBusy] = useState(false);

  const username = profile?.username?.trim() || '';

  // When the editor opens, seed it with whatever name we can show.
  useEffect(() => {
    if (editingName) setDraft(username || fallbackName);
  }, [editingName, username, fallbackName]);

  const commitName = async () => {
    const problem = validateUsername(draft);
    if (problem) {
      setNameError(problem);
      return;
    }
    setBusy(true);
    try {
      await onSaveUsername(draft);
      setEditingName(false);
      setNameError(null);
    } catch (err) {
      // Keep the editor open and show why (e.g. the name is taken).
      setNameError(err instanceof Error ? err.message : 'Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const pickAvatar = async (id: string) => {
    setBusy(true);
    try {
      await onSaveAvatar(id);
      setPickingAvatar(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="plate p-5">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setPickingAvatar((v) => !v)}
          className="group relative shrink-0"
          aria-label="Change avatar"
        >
          <AvatarImage id={profile?.avatarId ?? null} size={64} />
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-gold-500/50 bg-soot-900 text-gold-400">
            <Pencil size={12} />
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="stamp mb-1">Logged in as</div>

          {editingName ? (
            <div>
              <div className="flex items-center gap-2">
                <input
                  value={draft}
                  maxLength={USERNAME_MAX}
                  autoFocus
                  onChange={(e) => {
                    setDraft(e.target.value);
                    setNameError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitName();
                    if (e.key === 'Escape') setEditingName(false);
                  }}
                  className="min-w-0 flex-1 rounded-md border border-iron-700 bg-soot-950/60 px-3 py-2 font-display text-lg text-white outline-none focus:border-gold-500/60"
                  placeholder="Choose a username"
                />
                <button
                  type="button"
                  onClick={commitName}
                  disabled={busy}
                  aria-label="Save username"
                  className="btn-primary shrink-0 rounded-md p-2 disabled:opacity-50"
                >
                  <Check size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingName(false);
                    setNameError(null);
                  }}
                  aria-label="Cancel"
                  className="shrink-0 rounded-md border border-iron-700 p-2 text-ash-400 hover:text-ash-200"
                >
                  <X size={16} />
                </button>
              </div>
              {nameError && <div className="mt-1 text-xs text-red-300">{nameError}</div>}
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="group flex items-center gap-2 text-left"
              >
                <span className="font-display text-2xl font-semibold uppercase tracking-forge text-ash-200">
                  {username || <span className="text-ash-500">Set a username</span>}
                </span>
                <Pencil
                  size={14}
                  className="text-ash-600 transition-colors group-hover:text-gold-400"
                />
              </button>

              {email && (
                <div className="mt-0.5 truncate text-xs text-ash-600">
                  {email} <span className="text-ash-600/70">(not shared)</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {pickingAvatar && (
        <div className="mt-5 border-t border-iron-800 pt-4">
          <div className="stamp mb-3">Choose your mark</div>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
            {AVATARS.map((avatar) => {
              const selected = profile?.avatarId === avatar.id;
              return (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => pickAvatar(avatar.id)}
                  disabled={busy}
                  title={avatar.label}
                  aria-label={avatar.label}
                  aria-pressed={selected}
                  className={`relative rounded-full transition-transform hover:scale-105 ${
                    selected ? 'ring-2 ring-gold-500 ring-offset-2 ring-offset-soot-900' : ''
                  }`}
                >
                  <AvatarImage id={avatar.id} size={56} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default IdentityCard;
