import React, { useEffect, useState } from 'react';

interface LaunchAnimationProps {
  onComplete: () => void;
}

const FIRE_GIF =
  'https://images.squarespace-cdn.com/content/63ceec1f6db7d32cd45a7e8f/37b4821c-9b93-4e5c-beb3-943f7f6d02c9/output-onlinegiftools+%282%29.gif?content-type=image%2Fgif';

const LaunchAnimation: React.FC<LaunchAnimationProps> = ({ onComplete }) => {
  const [dismissed, setDismissed] = useState(false);

  const finish = () => {
    if (dismissed) return;
    setDismissed(true);
    onComplete();
  };

  useEffect(() => {
    // Total runtime: 2.5s hold + 0.7s fade-out (see .rf-launch in index.css).
    const timer = window.setTimeout(finish, 3200);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (dismissed) return null;

  return (
    <div
      className="rf-launch fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,126,61,0.18),transparent_30%),linear-gradient(180deg,#050608_0%,#0a0b0f_45%,#020202_100%)]"
      onClick={finish}
      role="button"
      tabIndex={0}
      aria-label="Skip intro"
    >
      <div className="relative flex items-center justify-center">
        <span className="rf-launch-ring absolute h-40 w-40 rounded-full border border-gold-400/40" />
        <span className="rf-launch-ring absolute h-40 w-40 rounded-full border border-gold-500/30" style={{ animationDelay: '0.55s' }} />
        <div className="rf-launch-flame inline-flex items-center justify-center rounded-3xl border border-gold-500/30 bg-soot-950/60 p-6 shadow-2xl ">
          <img src={FIRE_GIF} alt="Fire" className="h-24 w-24 object-contain" />
        </div>
      </div>

      <div className="rf-launch-title mt-10 bg-gradient-to-r from-gold-400 via-gold-400 to-red-500 bg-clip-text text-center text-5xl font-black uppercase tracking-tight text-transparent sm:text-6xl">
        Refiner&apos;s Fire
      </div>

      <div className="rf-launch-tagline mt-4 text-center text-[11px] font-black uppercase tracking-[0.35em] text-ash-500">
        A dramatic Bible challenge, forged in Revelation.
      </div>

      <div className="rf-launch-tagline absolute bottom-10 text-[10px] font-bold uppercase tracking-[0.35em] text-ash-600">
        Tap to skip
      </div>
    </div>
  );
};

export default LaunchAnimation;
