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
      className="rf-launch fixed inset-0 z-[100] flex flex-col items-center justify-center bg-soot-950 bg-[radial-gradient(55%_45%_at_50%_0%,rgba(255,176,106,0.16),rgba(8,7,10,0)_60%),radial-gradient(75%_60%_at_50%_100%,rgba(232,84,15,0.30),rgba(8,7,10,0)_78%)]"
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

      {/* Title matches the home screen exactly: struck condensed ink, no gradient fill. */}
      <h1 className="rf-launch-title struck mt-10 text-center text-6xl sm:text-7xl">
        Refiner&apos;s Fire
      </h1>

      <div className="rf-launch-tagline mx-auto mt-5 w-40 rule-fade" />

      <p className="rf-launch-tagline mt-5 text-center text-sm text-ash-500">
        A dramatic Bible challenge, forged in Revelation.
      </p>

      <div className="rf-launch-tagline absolute bottom-10 font-display text-xs font-semibold uppercase tracking-forge text-ash-600">
        Tap to skip
      </div>
    </div>
  );
};

export default LaunchAnimation;
