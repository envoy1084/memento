import {
  Description,
  FieldError,
  Input,
  Label,
  NativeSelect,
  Switch,
  TextArea,
  TextField,
} from "@thenamespace/uikit";
export function Field({
  label,
  value,
  onChange,
  placeholder,
  description,
  type = "text",
  required = false,
  multiline = false,
  maxLength,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  description?: string;
  type?: "text" | "email" | "number" | "url";
  required?: boolean;
  multiline?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
}) {
  return (
    <TextField
      className="w-full"
      value={value}
      onChange={onChange}
      isRequired={required}
      type={type}
      {...(maxLength === undefined ? {} : { maxLength })}
    >
      <Label>{label}</Label>
      {multiline ? (
        <TextArea placeholder={placeholder ?? ""} rows={4} />
      ) : (
        <Input
          placeholder={placeholder ?? ""}
          {...(min === undefined ? {} : { min })}
          {...(max === undefined ? {} : { max })}
        />
      )}
      {description ? <Description>{description}</Description> : null}
      <FieldError />
    </TextField>
  );
}
export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <NativeSelect fullWidth>
      <Label>{label}</Label>
      <NativeSelect.Trigger value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <NativeSelect.Option key={option.value} value={option.value}>
            {option.label}
          </NativeSelect.Option>
        ))}
        <NativeSelect.Indicator />
      </NativeSelect.Trigger>
    </NativeSelect>
  );
}
export function Toggle({
  label,
  description,
  selected,
  onChange,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onChange: (selected: boolean) => void;
}) {
  return (
    <Switch isSelected={selected} onChange={onChange}>
      <Switch.Content>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
        {label}
      </Switch.Content>
      {description ? <Description>{description}</Description> : null}
    </Switch>
  );
}
