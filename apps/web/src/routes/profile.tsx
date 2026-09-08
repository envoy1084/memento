import { useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";

import type { PreviewProfile } from "@memento/protocol";
import { Button, Card, Form, toast } from "@thenamespace/uikit";

import { Field, SelectField, Toggle } from "#/components/fields";
import { Icon } from "#/components/icon";
import { CopyButton, Empty, PageTitle, SummaryRow } from "#/components/page";
import { ThemePicker, type GiftTheme } from "#/features/gifts/theme-picker";
import { useDemo } from "#/hooks/use-demo";
export const Route = createFileRoute("/profile")({ component: ProfilePage });
function ProfilePage() {
  const [state, setState] = useDemo();
  const [selected, setSelected] = useState("");
  const profile = state.profiles.find((entry) => entry.name === selected) ?? state.profiles.at(-1);
  return (
    <div className="mx-auto w-[calc(100%-40px)] max-w-[1100px] py-12 md:w-[calc(100%-96px)]">
      <PageTitle
        eyebrow="A LITTLE MORE YOU"
        title="Your name. Your story."
        description="Make your little corner of the internet feel like home."
      />
      {profile ? (
        <>
          <div className="my-8 max-w-xs">
            <SelectField
              label="Your names"
              value={profile.name}
              onChange={setSelected}
              options={state.profiles.map((entry) => ({ value: entry.name, label: entry.name }))}
            />
          </div>
          <ProfileEditor
            key={profile.name}
            profile={profile}
            save={(next) =>
              setState((current) => ({
                ...current,
                profiles: current.profiles.map((entry) =>
                  entry.name === next.name
                    ? next
                    : { ...entry, primary: next.primary ? false : entry.primary },
                ),
              }))
            }
          />
        </>
      ) : (
        <div className="mt-10">
          <Empty
            title="Your name is waiting for you."
            description="Open a gift and claim your first identity in this preview. Then come back to make it yours."
            to="/claim/a-little-beginning"
            action="Open your gift"
          />
        </div>
      )}
    </div>
  );
}
function ProfileEditor({
  profile,
  save,
}: {
  profile: PreviewProfile;
  save: (next: PreviewProfile) => void;
}) {
  const [bio, setBio] = useState(profile.bio);
  const [website, setWebsite] = useState(profile.website);
  const [theme, setTheme] = useState<GiftTheme>(profile.theme);
  const [primary, setPrimary] = useState(profile.primary);
  const colors = {
    aura: "from-[#e7d7f7] to-[#f8eefb]",
    rose: "from-[#f2d6e1] to-[#fff0f5]",
    mint: "from-[#cde5d7] to-[#f0faf4]",
  };
  return (
    <div className="grid items-start gap-8 lg:grid-cols-2">
      <div>
        <Card className="overflow-hidden rounded-[28px] border border-separator p-0 shadow-none">
          <div className={`relative flex h-44 items-end bg-linear-140 ${colors[theme]} p-7`}>
            <span className="absolute top-6 right-6 text-[#ae91bf]">
              <Icon name="sparkle" size={30} />
            </span>
            <span className="-mb-14 flex size-24 items-center justify-center rounded-[28px] border-4 border-white bg-surface-secondary font-serif text-5xl text-[#a183b5] italic">
              {profile.name.charAt(0)}
            </span>
          </div>
          <div className="px-7 pt-16 pb-7">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="break-all text-3xl">{profile.name}</h2>
              {primary ? (
                <span className="rounded-full bg-success/10 px-2 py-1 text-[9px] text-success">
                  Primary name
                </span>
              ) : null}
            </div>
            <p className="mt-4 text-sm text-muted">{bio || "Your story starts here."}</p>
            {website ? (
              <p className="mt-4 flex items-center gap-2 break-all text-xs text-[#8c6da0]">
                <Icon name="globe" size={14} />
                {website}
              </p>
            ) : null}
            <div className="mt-7">
              <CopyButton value={profile.name} label="Copy name" />
            </div>
          </div>
        </Card>
        <p className="mt-5 text-center text-xs text-muted">
          A name for all the things you’ll become.
        </p>
      </div>
      <Card className="rounded-3xl border border-separator p-7 shadow-none">
        <Form
          className="w-full space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            save({ ...profile, bio, website, theme, primary });
            toast.success("Your preview feels a little more like you");
          }}
        >
          <h3>Make it personal</h3>
          <Field
            label="A little about you"
            value={bio}
            onChange={setBio}
            multiline
            maxLength={200}
            placeholder="Curious mind. Maker of things. Here for what’s next."
          />
          <Field
            label="Your website"
            type="url"
            value={website}
            onChange={setWebsite}
            placeholder="https://yourcorner.xyz"
          />
          <p className="text-sm font-medium">Your color</p>
          <ThemePicker value={theme} onChange={setTheme} />
          <Toggle
            label="Use as my primary name"
            selected={primary}
            onChange={setPrimary}
            description="The name you introduce yourself with across apps."
          />
          <Button type="submit" fullWidth>
            Save your touches
            <Icon name="check" size={17} />
          </Button>
          <p className="text-[11px] text-muted">
            Saved in this browser only. Your onchain profile stays unchanged.
          </p>
        </Form>
        <div className="mt-6 border-t border-separator pt-3">
          <SummaryRow label="Ownership">Your preview wallet</SummaryRow>
          <Link to="/send" className="mt-4 inline-flex items-center gap-2 text-xs text-[#8c6da0]">
            Give someone their beginning
            <Icon name="gift" size={16} />
          </Link>
        </div>
      </Card>
    </div>
  );
}
