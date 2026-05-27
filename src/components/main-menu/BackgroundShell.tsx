import React, { useMemo } from 'react';

interface BackgroundShellProps {
  children: React.ReactNode;
  className?: string;
}

const BackgroundShell: React.FC<BackgroundShellProps> = ({ children, className }) => {
  const embers = useMemo(() => {
    return Array.from({ length: 34 }).map((_, i) => {
      const left = Math.random() * 100;
      const delay = Math.random() * 5;
      const duration = 5 + Math.random() * 6;
      const size = 2 + Math.random() * 3;
      const opacity = 0.25 + Math.random() * 0.5;
      return { key: `e${i}`, left, delay, duration, size, opacity };
    });
  }, []);

  return (
    <div
      className={`relative min-h-screen w-full overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,126,61,0.12),transparent_28%),linear-gradient(180deg,#050608_0%,#0a0b0f_35%,#020202_100%)] text-slate-100 ${
        className || ''
      }`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-10%] h-[24rem] w-[46rem] -translate-x-1/2 heavenly-crown opacity-80" />
        <div className="absolute inset-x-[12%] top-0 h-[78vh] cathedral-rays opacity-55" />
        <div className="absolute inset-x-[24%] top-[-8%] h-[62vh] cathedral-rays-soft opacity-45" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_40%_at_50%_8%,rgba(255,211,157,0.2),rgba(0,0,0,0))]" />
        <div className="absolute inset-0 bg-[radial-gradient(58%_38%_at_50%_8%,rgba(255,122,43,0.34),rgba(0,0,0,0))]" />
        <div className="absolute inset-0 bg-[radial-gradient(48%_34%_at_20%_22%,rgba(255,88,34,0.16),rgba(0,0,0,0))]" />
        <div className="absolute inset-0 bg-[radial-gradient(42%_30%_at_80%_20%,rgba(255,176,92,0.14),rgba(0,0,0,0))]" />
        <div className="absolute left-1/2 top-[4%] h-[16rem] w-[28rem] -translate-x-1/2 rounded-[100%] stained-glow opacity-85" />
        <div className="absolute inset-x-0 bottom-0 h-[45vh] bg-[radial-gradient(60%_90%_at_50%_100%,rgba(255,90,28,0.18),rgba(0,0,0,0))]" />
        <div className="absolute inset-0 dramatic-smoke opacity-60" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.18),rgba(0,0,0,0.58))]" />
        <div className="absolute inset-0 shadow-[inset_0_0_180px_rgba(0,0,0,0.85)]" />
      </div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[7%] h-[18rem] w-[18rem] -translate-x-1/2 rounded-full bg-orange-500/10 blur-3xl slow-drift" />
        <div className="absolute left-[10%] top-[26%] h-[13rem] w-[13rem] rounded-full bg-red-500/8 blur-3xl reverse-drift" />
        <div className="absolute right-[8%] top-[20%] h-[15rem] w-[15rem] rounded-full bg-amber-200/10 blur-3xl slow-drift" />
        {embers.map((e) => (
          <span
            key={e.key}
            className="absolute bottom-[-10px] rounded-full bg-orange-400 ember"
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
