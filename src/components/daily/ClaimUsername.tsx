import React, { useState } from 'react';
import { claimUsername, USERNAME_MAX, UsernameTakenError, validateUsername } from '../../utils/userProfile';

/**
 * Shown on a results screen to a member who has no username yet. Scores are posted under a
 * username, so without one the run would silently never reach the board. Claiming here updates
 * the profile, and the results screen's post hook picks the new name up and posts the run.
 */
const ClaimUsername: React.FC<{ uid: string }> = ({ uid }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validateUsername(name);
    if (problem) { setError(problem); return; }
    setSaving(true);
    setError(null);
    try {
      await claimUsername(uid, name);
    } catch (err) {
      setError(err instanceof UsernameTakenError ? 'That name is taken. Try another.' : 'Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 text-left">
      <label htmlFor="claim-username" className="mb-1 block text-xs text-ash-500">
        Pick a username to post this score to the world leaderboard.
      </label>
      <div className="flex gap-2">
        <input
          id="claim-username"
          value={name}
          maxLength={USERNAME_MAX}
          onChange={(e) => setName(e.target.value)}
          placeholder="Username"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-md border border-iron-700 bg-soot-900 px-3 py-2.5 text-sm text-ash-200 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-500/30"
        />
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="btn-primary px-4 py-2.5 font-display text-xs font-semibold uppercase tracking-forge disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Post'}
        </button>
      </div>
      {error && <div role="alert" className="mt-1 text-xs text-red-300">{error}</div>}
    </form>
  );
};

export default ClaimUsername;
