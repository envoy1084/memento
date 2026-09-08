import { useEffect, useRef, useState } from "react";

import { Button, ProgressBar } from "@thenamespace/uikit";
import { motion } from "motion/react";

import { Icon } from "#/components/icon";
export function ClaimProgress({ name, onComplete }: { name: string; onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const complete = useRef(onComplete);
  complete.current = onComplete;
  const finished = useRef(false);
  useEffect(() => {
    const timer = window.setInterval(() => setProgress((value) => Math.min(3, value + 1)), 1400);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (progress === 3 && !finished.current) {
      finished.current = true;
      complete.current();
    }
  }, [progress]);
  return (
    <div aria-live="polite" className="py-5">
      <span className="mb-7 inline-flex rounded-2xl bg-accent-soft p-4 text-accent-soft-foreground">
        <Icon name="sparkle" size={32} />
      </span>
      <h2>Making it yours.</h2>
      <p className="mt-4 text-sm text-muted">
        A little moment for a whole new beginning.
        <br />
        We’re getting {name} ready for you.
      </p>
      <div className="my-8 space-y-5">
        {["Keeping your name safe", "Finding its home", "Adding the finishing touches"].map(
          (label, index) => (
            <div
              key={label}
              className={`flex items-center gap-3 text-sm ${progress >= index ? "text-foreground" : "text-muted/50"}`}
            >
              <motion.span
                animate={{ scale: progress === index ? [1, 1.12, 1] : 1 }}
                transition={{ repeat: progress === index ? Infinity : 0, duration: 1.4 }}
                className={`flex size-7 items-center justify-center rounded-full ${progress > index ? "bg-success/10 text-success" : "bg-accent-soft"}`}
              >
                {progress > index ? <Icon name="check" size={16} /> : index + 1}
              </motion.span>
              {label}
            </div>
          ),
        )}
      </div>
      <ProgressBar aria-label="Preparing your demo name" value={(progress / 3) * 100}>
        <ProgressBar.Track>
          <ProgressBar.Fill />
        </ProgressBar.Track>
      </ProgressBar>
      <p className="mt-6 text-xs text-muted">
        This is a simulated claim. No transaction is being sent.
      </p>
      <Button variant="ghost" size="sm" className="mt-4" onPress={() => setProgress(3)}>
        Skip preview animation
      </Button>
    </div>
  );
}
