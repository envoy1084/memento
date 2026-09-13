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
        const colors = [
          "--color-lavender-400",
          "--color-lavender-200",
          "--color-blush-400",
          "--color-sage-400",
        ].map((token) => style.getPropertyValue(token).trim());
        const base = {
          colors,
          ticks: 150,
          gravity: 0.95,
          decay: 0.93,
          disableForReducedMotion: true,
        };

        for (let beat = 0; beat < 10; beat++) {
          timers.push(
            setTimeout(() => {
              void fire({
                ...base,
                particleCount: 10,
                startVelocity: 48 - beat * 1.5,
                angle: 60,
                spread: 60,
                origin: { x: 0, y: 0.65 },
              });
              void fire({
                ...base,
                particleCount: 10,
                startVelocity: 48 - beat * 1.5,
                angle: 120,
                spread: 60,
                origin: { x: 1, y: 0.65 },
              });
            }, beat * 140),
          );
        }
        timers.push(
          setTimeout(() => {
            for (const [particleCount, spread, startVelocity, scalar] of [
              [35, 26, 50, 1],
              [30, 60, 40, 0.9],
              [45, 100, 30, 0.8],
              [20, 120, 22, 1.1],
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
          }, 1500),
        );
        timers.push(setTimeout(() => fire.reset(), 4000));
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
