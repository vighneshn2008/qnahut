import { useEffect, useMemo, useState } from 'react';

const COLOR_VARS = [
  'var(--color-accent-primary)',
  'var(--color-accent-secondary)',
  'var(--color-accent-warn)',
  'var(--color-accent-success)',
];

/**
 * A short-lived burst of falling confetti. Regenerates and replays whenever
 * `triggerKey` changes (e.g. incrementing a counter each time the
 * leaderboard is shown, or the leader changes). Purely decorative —
 * respects prefers-reduced-motion via CSS.
 */
export default function Confetti({ triggerKey, count = 90, duration = 3000 }) {
  const [visible, setVisible] = useState(false);

  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: COLOR_VARS[Math.floor(Math.random() * COLOR_VARS.length)],
        size: 5 + Math.random() * 7,
        delay: Math.random() * 0.5,
        fallDuration: 2 + Math.random() * 1.5,
        rotate: Math.round(Math.random() * 480 - 240),
        drift: Math.round((Math.random() - 0.5) * 140),
        round: Math.random() > 0.5,
      })),
    // Regenerate a fresh random burst each time the trigger fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [triggerKey, count],
  );

  useEffect(() => {
    if (!triggerKey) return undefined;
    setVisible(true);
    const timeout = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timeout);
  }, [triggerKey, duration]);

  if (!visible) return null;

  return (
    <div className="confetti-layer" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.round ? '50%' : '2px',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.fallDuration}s`,
            '--drift': `${p.drift}px`,
            '--rotate': `${p.rotate}deg`,
          }}
        />
      ))}
    </div>
  );
}
