import { useEffect, useRef, useState } from "react";

import { Button, ProgressBar, Spinner, Timeline } from "@thenamespace/uikit";

import { NameMark } from "#/components/brand";
import { Icon } from "#/components/icon";
import { Eyebrow } from "#/components/page";

const stages = [
  { title: "Reserving the name", body: "Making sure nobody else can take it while you finish." },
  { title: "Setting up your wallet", body: "Creating the place your name will live." },
  { title: "Signing it over to you", body: "The registration is paid for by the gift." },
];

export function ClaimProgress({ name, onComplete }: { name: string; onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const complete = useRef(onComplete);
  complete.current = onComplete;
  const finished = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(
      () => setProgress((value) => Math.min(stages.length, value + 1)),
      1300,
    );
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (progress === stages.length && !finished.current) {
      finished.current = true;
      complete.current();
    }
  }, [progress]);

  return (
    <div>
      <Eyebrow className="mb-4">Almost yours</Eyebrow>
      <h1>Getting things ready.</h1>
      <p className="mt-3 max-w-[44ch] text-[15px] text-ink-soft">
        A short moment while we set up <NameMark name={name} size="sm" /> for you.
      </p>

      <Timeline className="my-8" density="comfortable" size="sm" aria-live="polite">
        {stages.map((stage, index) => {
          const done = progress > index;
          const active = progress === index;
          return (
            <Timeline.Item
              key={stage.title}
              status={done ? "success" : active ? "current" : "muted"}
            >
              <Timeline.Marker aria-hidden="true">
                {done ? (
                  <Icon name="check" size={14} />
                ) : active ? (
                  <Spinner size="sm" />
                ) : (
                  index + 1
                )}
              </Timeline.Marker>
              <Timeline.Content>
                <p
                  className={`m-0 text-sm font-medium ${done || active ? "text-ink" : "text-ink-faint"}`}
                >
                  {stage.title}
                </p>
                <p className="m-0 mt-1 max-w-[40ch] text-[13px] leading-6 text-ink-soft">
                  {stage.body}
                </p>
              </Timeline.Content>
            </Timeline.Item>
          );
        })}
      </Timeline>

      <ProgressBar
        aria-label="Preparing your name"
        value={(progress / stages.length) * 100}
        size="sm"
      >
        <ProgressBar.Track>
          <ProgressBar.Fill />
        </ProgressBar.Track>
      </ProgressBar>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-xs text-ink-soft">Simulated. No transaction is being sent.</p>
        <Button variant="ghost" size="sm" onPress={() => setProgress(stages.length)}>
          Skip ahead
        </Button>
      </div>
    </div>
  );
}
