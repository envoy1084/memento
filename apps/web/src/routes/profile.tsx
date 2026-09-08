import { useState } from "react";

import { createFileRoute } from "@tanstack/react-router";

import type { PreviewProfile } from "@memento/protocol";
import { Button, Card, Form, Separator, toast } from "@thenamespace/uikit";

import { Field, SelectField, Toggle } from "#/components/common/fields";
import { Icon } from "#/components/common/icon";
import {
  ButtonLink,
  CopyButton,
  DetailList,
  DetailRow,
  EmptyPanel,
  Eyebrow,
  Note,
  PageHeader,
  Section,
} from "#/components/common/page";
import { ThemePicker, type GiftTheme } from "#/components/common/theme-picker";
import { NameMark, ShellMark } from "#/components/display/brand";
import { useDemo } from "#/hooks/use-demo";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

function ProfilePage() {
  const [state, setState] = useDemo();
  const [selected, setSelected] = useState("");
  const profile = state.profiles.find((entry) => entry.name === selected) ?? state.profiles.at(-1);

  return (
    <Section width="form" className="py-12">
      <PageHeader
        eyebrow="Your identity"
        title="Your name, your story."
        description="Everything here travels with your name. Apps that speak ENS can show it wherever you go."
        action={
          state.profiles.length > 1 && profile ? (
            <div className="w-56">
              <SelectField
                label="Showing"
                value={profile.name}
                onChange={setSelected}
                options={state.profiles.map((entry) => ({
                  value: entry.name,
                  label: entry.name,
                }))}
              />
            </div>
          ) : undefined
        }
      />

      {profile ? (
        <div className="mt-10">
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
        </div>
      ) : (
        <div className="mt-10">
          <EmptyPanel
            icon="person"
            title="No name yet."
            description="Open a gift and claim your first name in this preview. Then come back and make it yours."
            action={
              <ButtonLink to="/claim/$giftId" params={{ giftId: "a-little-beginning" }}>
                Open a sample gift
              </ButtonLink>
            }
          />
        </div>
      )}
    </Section>
  );
}

const covers: Record<GiftTheme, string> = {
  aura: "from-lavender-100 to-lavender-50",
  rose: "from-blush-100 to-blush-50",
  mint: "from-sage-100 to-sage-50",
};

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

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
      <div className="lg:sticky lg:top-28">
        <Eyebrow className="mb-4">How others see you</Eyebrow>
        <Card
          variant="transparent"
          className="overflow-hidden rounded-[28px] border border-rule bg-paper-raised p-0 shadow-lift"
        >
          <div className={`relative flex h-40 items-end bg-linear-140 ${covers[theme]} px-7`}>
            <ShellMark tone="lavender" size={30} className="absolute top-6 right-6 opacity-60" />
            <span className="-mb-12 grid size-24 place-content-center rounded-[26px] border-4 border-paper-raised bg-paper-sunken font-display text-4xl font-semibold text-lavender-600">
              {profile.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="px-7 pt-16 pb-7">
            <div className="flex flex-wrap items-center gap-3">
              <NameMark name={profile.name} size="lg" />
              {primary ? (
                <span className="rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-medium text-success">
                  Primary
                </span>
              ) : null}
            </div>
            <p className="mt-4 mb-0 text-[15px] leading-relaxed text-ink-soft">
              {bio || "Your story starts here."}
            </p>
            {website ? (
              <p className="mt-4 mb-0 flex items-center gap-2 text-[13px] break-all text-lavender-700">
                <Icon name="globe" size={15} />
                {website}
              </p>
            ) : null}
            <div className="mt-7">
              <CopyButton value={profile.name} label="Copy name" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="rounded-3xl border border-rule p-6 shadow-none md:p-7">
        <Form
          className="w-full space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            save({ ...profile, bio, website, theme, primary });
            toast.success("Profile saved");
          }}
        >
          <h3 className="m-0">Make it personal</h3>
          <Field
            label="About you"
            value={bio}
            onChange={setBio}
            multiline
            rows={3}
            maxLength={200}
            placeholder="Curious mind. Maker of things. Here for what’s next."
          />
          <Field
            label="Website"
            type="url"
            value={website}
            onChange={setWebsite}
            placeholder="https://yourcorner.xyz"
            description="Shown next to your name in apps that support it."
          />
          <Separator />
          <ThemePicker
            value={theme}
            onChange={setTheme}
            label="Your colour"
            description="Used on your profile card and any gifts you send."
          />
          <Separator />
          <Toggle
            label="Use as my primary name"
            selected={primary}
            onChange={setPrimary}
            description="The name apps show first when they recognise your wallet."
          />
          <Button type="submit" fullWidth size="lg">
            Save changes
            <Icon name="check" size={18} />
          </Button>
        </Form>
        <Separator className="my-6" />
        <DetailList>
          <DetailRow label="Held in">Your preview wallet</DetailRow>
          <DetailRow label="Renewal">Covered by the gift</DetailRow>
        </DetailList>
        <div className="mt-6">
          <Note>Saved in this browser only. Nothing is written onchain.</Note>
        </div>
      </Card>
    </div>
  );
}
