import { Description, Label, RadioButtonGroup } from "@thenamespace/uikit";

export type GiftTheme = "aura" | "rose" | "mint";

const wrappings: { id: GiftTheme; label: string; hint: string; swatch: string }[] = [
  {
    id: "aura",
    label: "Lavender",
    hint: "Calm and quietly special",
    swatch: "from-lavender-100 to-lavender-400",
  },
  {
    id: "rose",
    label: "Blush",
    hint: "Warm, for someone close",
    swatch: "from-blush-100 to-blush-400",
  },
  {
    id: "mint",
    label: "Sage",
    hint: "Fresh, for a new start",
    swatch: "from-sage-100 to-sage-400",
  },
];

export function ThemePicker({
  value,
  onChange,
  label = "Wrapping",
  description,
}: {
  value: GiftTheme;
  onChange: (value: GiftTheme) => void;
  label?: string;
  description?: string;
}) {
  return (
    <RadioButtonGroup
      orientation="horizontal"
      variant="secondary"
      value={value}
      onChange={(next) => {
        if (next === "aura" || next === "rose" || next === "mint") onChange(next);
      }}
      className="w-full"
    >
      <Label>{label}</Label>
      {description ? <Description>{description}</Description> : null}
      <div className="mt-2 grid w-full grid-cols-3 gap-3">
        {wrappings.map((wrapping) => (
          <RadioButtonGroup.Item key={wrapping.id} value={wrapping.id} className="!p-3">
            <RadioButtonGroup.ItemIcon>
              <span
                aria-hidden="true"
                className={`block size-6 rounded-full bg-linear-135 ${wrapping.swatch}`}
              />
            </RadioButtonGroup.ItemIcon>
            <RadioButtonGroup.ItemContent>
              <Label className="text-[13px]">{wrapping.label}</Label>
              <Description className="hidden text-[11px] sm:block">{wrapping.hint}</Description>
            </RadioButtonGroup.ItemContent>
          </RadioButtonGroup.Item>
        ))}
      </div>
    </RadioButtonGroup>
  );
}
