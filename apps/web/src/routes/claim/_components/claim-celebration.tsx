import { useEffect, useRef } from "react";

export function ClaimCelebration() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvas.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const surface = canvas.current;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let reset: (() => void) | undefined;

    void import("canvas-confetti")
      .then(({ default: confetti }) => {
        if (cancelled) return undefined;
        const fire = confetti.create(surface, { resize: true, disableForReducedMotion: true });
        reset = () => fire.reset();
        const style = getComputedStyle(document.documentElement);
        const colors = ["--color-lavender-400", "--color-blush-400", "--color-sage-400"].map(
          (token) => style.getPropertyValue(token).trim(),
        );
        const base = { colors, ticks: 130, gravity: 1.1, disableForReducedMotion: true };

        for (let beat = 0; beat < 6; beat++) {
          timers.push(
            setTimeout(() => {
              void fire({
                ...base,
                particleCount: 9,
                angle: 60,
                spread: 50,
                origin: { x: 0, y: 0.65 },
              });
              void fire({
                ...base,
                particleCount: 9,
                angle: 120,
                spread: 50,
                origin: { x: 1, y: 0.65 },
              });
            }, beat * 120),
          );
        }
        timers.push(
          setTimeout(() => {
            for (const [particleCount, spread, startVelocity, scalar] of [
              [25, 26, 45, 1],
              [20, 60, 35, 0.9],
              [35, 100, 28, 0.8],
              [15, 120, 20, 1.1],
            ]) {
              void fire({
                ...base,
                particleCount,
                spread,
                startVelocity,
                scalar,
                origin: { x: 0.5, y: 0.7 },
              });
            }
          }, 850),
        );
        return undefined;
      })
      .catch((error: unknown) => {
        // eslint-disable-next-line no-console -- Report asset-load failure without interrupting a successful claim.
        console.error("Could not load the gift celebration", error);
      });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      reset?.();
    };
  }, []);

  return (
    <canvas
      ref={canvas}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
    />
  );
}
