import { Label, RadioButtonGroup } from "@thenamespace/uikit";
const swatches = { aura: "bg-[#cfb5eb]", rose: "bg-[#efc6d7]", mint: "bg-[#b8d6c5]" };
export type GiftTheme = "aura" | "rose" | "mint";
export function ThemePicker({
  value,
  onChange,
}: {
  value: GiftTheme;
  onChange: (value: GiftTheme) => void;
}) {
  return (
    <RadioButtonGroup
      aria-label="Gift wrapping"
      orientation="horizontal"
      value={value}
      onChange={(next) => {
        if (next === "aura" || next === "rose" || next === "mint") onChange(next);
      }}
      className="flex flex-wrap gap-3"
    >
      {[
        { id: "aura", label: "Lavender" },
        { id: "rose", label: "Rose" },
        { id: "mint", label: "Sage" },
      ].map((theme) => (
        <RadioButtonGroup.Item
          key={theme.id}
          value={theme.id}
          className="flex-1 !rounded-xl !p-3 [&_label]:text-xs"
        >
          <span className={`inline-block size-5 rounded-full ${swatches[theme.id as GiftTheme]}`} />
          <Label>{theme.label}</Label>
        </RadioButtonGroup.Item>
      ))}
    </RadioButtonGroup>
  );
}
