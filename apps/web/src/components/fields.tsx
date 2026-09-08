import { useId, type ReactNode } from "react";

import {
  Description,
  FieldError,
  Input,
  Label,
  NativeSelect,
  NumberField,
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
  rows = 4,
  maxLength,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  description?: ReactNode;
  type?: "text" | "email" | "url";
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  autoComplete?: string;
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
        <TextArea placeholder={placeholder ?? ""} rows={rows} />
      ) : (
        <Input placeholder={placeholder ?? ""} {...(autoComplete ? { autoComplete } : {})} />
      )}
      {description ? <Description>{description}</Description> : null}
      <FieldError />
    </TextField>
  );
}

/**
 * A real stepper for every numeric input. Keyboard, scroll wheel, locale
 * formatting and min/max clamping all come from UIKit.
 */
export function NumberInput({
  label,
  value,
  onChange,
  description,
  min,
  max,
  step = 1,
  format,
  required = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  description?: ReactNode;
  min?: number;
  max?: number;
  step?: number;
  format?: Intl.NumberFormatOptions;
  required?: boolean;
}) {
  return (
    <NumberField
      fullWidth
      value={value}
      onChange={(next) => onChange(typeof next === "number" && Number.isFinite(next) ? next : 0)}
      isRequired={required}
      step={step}
      {...(min === undefined ? {} : { minValue: min })}
      {...(max === undefined ? {} : { maxValue: max })}
      {...(format ? { formatOptions: format } : {})}
    >
      <Label>{label}</Label>
      <NumberField.Group>
        <NumberField.DecrementButton aria-label={`Decrease ${label.toLowerCase()}`} />
        <NumberField.Input />
        <NumberField.IncrementButton aria-label={`Increase ${label.toLowerCase()}`} />
      </NumberField.Group>
      {description ? <Description>{description}</Description> : null}
      <FieldError />
    </NumberField>
  );
}

/**
 * NativeSelect does not wire its own label, so the id/htmlFor pair is set here
 * once instead of being forgotten at every call site.
 */
export function SelectField({
  label,
  value,
  onChange,
  options,
  description,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  description?: ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <NativeSelect fullWidth>
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect.Trigger
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <NativeSelect.Option key={option.value} value={option.value}>
            {option.label}
          </NativeSelect.Option>
        ))}
        <NativeSelect.Indicator />
      </NativeSelect.Trigger>
      {description ? <Description>{description}</Description> : null}
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
  description?: ReactNode;
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
