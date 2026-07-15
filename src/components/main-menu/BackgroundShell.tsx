import React, { useMemo } from 'react';

interface BackgroundShellProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * The clean, dramatic composition from the share image (og.png): a soot base, one warm crown glow
 * at the top, a single heat glow rising from the bottom, drifting embers, and a heavy vignette.
 * Deliberately far fewer layers than before — the darkness is the point.
 */
const BackgroundShell: React.FC<BackgroundShellProps> = ({ children, className }) => {
  const embers = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => {
      const left = Math.random() * 100;
      const delay = Math.random() * 6;
      const duration = 6 + Math.random() * 7;
      const size = 1.5 + Math.random() * 2.5;
      const opacity = 0.4 + Math.random() * 0.5;
      return { key: `e${i}`, left, delay, duration, size, opacity };
    });
  }, []);

  return (
    <div
      className={`relative min-h-screen w-full overflow-hidden bg-soot-950 text-ash-200 ${
        className || ''
      }`}
    >
      <div className="pointer-events-none absolute inset-0">
        {/* Crown glow — a soft warm light from above. */}
        <div className="absolute inset-0 bg-[radial-gradient(55%_45%_at_50%_0%,rgba(255,176,106,0.16),rgba(8,7,10,0)_60%)]" />
        {/* Heat rising from the base, a touch stronger and taller than the share image so the
            lower two-thirds doesn't fall away into flat black. */}
        <div className="absolute inset-0 bg-[radial-gradient(75%_60%_at_50%_100%,rgba(232,84,15,0.36),rgba(154,47,10,0.13)_48%,rgba(8,7,10,0)_78%)]" />
        {/* Vignette to pull the edges into shadow. */}
        <div className="absolute inset-0 shadow-[inset_0_0_220px_rgba(0,0,0,0.9)]" />
      </div>

      {/* Drifting embers off the bottom edge. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {embers.map((e) => (
          <span
            key={e.key}
            className="ember absolute bottom-[-10px] rounded-full bg-ember-300 shadow-[0_0_6px_1px_rgba(255,143,77,0.7)]"
            style={{
              left: `${e.left}%`,
              width: `${e.size}px`,
              height: `${e.size}px`,
              opacity: e.opacity,
              animationDelay: `${e.delay}s`,
              animationDuration: `${e.duration}s`,
            }}
          />
        ))}
      </div>

      <div className="relative">{children}</div>
    </div>
  );
};

export default BackgroundShell;
