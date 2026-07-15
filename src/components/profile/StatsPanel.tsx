import React from 'react';
import { Flame, Swords, Target, Trophy } from 'lucide-react';
import type { UserStats } from '../../utils/userStats';

const Stat: React.FC<{ icon: React.ReactNode; value: React.ReactNode; label: string }> = ({
  icon,
  value,
  label,
}) => (
  <div className="border border-iron-800 bg-soot-950/40 p-4 text-center">
    <div className="mb-1 flex justify-center text-forge-400">{icon}</div>
    <div className="font-display text-2xl font-extrabold text-ash-200">{value}</div>
    <div className="mt-0.5 text-xs text-ash-500">{label}</div>
  </div>
);

const StatsPanel: React.FC<{ stats: UserStats }> = ({ stats }) => (
  <div className="plate p-5">
    <div className="stamp mb-4">Progress</div>

    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Stat
        icon={<Flame size={20} />}
        value={stats.currentStreak}
        label={stats.currentStreak === 1 ? 'day streak' : 'day streak'}
      />
      <Stat icon={<Target size={20} />} value={stats.versesRefined} label="verses refined" />
      <Stat icon={<Trophy size={20} />} value={stats.dailyBest} label="best daily" />
      <Stat icon={<Swords size={20} />} value={stats.furnaceBest} label="furnace best" />
    </div>

    {stats.bestStreak > 0 && (
      <div className="mt-3 text-center text-xs text-ash-500">
        Longest streak: <span className="text-ash-300">{stats.bestStreak} days</span>
      </div>
    )}
  </div>
);

export default StatsPanel;
