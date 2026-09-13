import type { ReactNode } from "react";

import {
  Description,
  FieldError,
  Input,
  Label,
  ListBox,
  Select,
  NumberField,
  Switch,
  TextArea,
  TextField,
} from "@thenamespace/uikit";

export function Field({
  label,
  hideLabel = false,
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
  hideLabel?: boolean;
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
      <Label className={hideLabel ? "sr-only" : undefined}>{label}</Label>
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
  return (
    <Select
      fullWidth
      value={value}
      isDisabled={disabled}
      onChange={(key) => {
        if (key !== null) onChange(String(key));
      }}
    >
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map((option) => (
            <ListBox.Item key={option.value} id={option.value} textValue={option.label}>
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
      {description ? <Description>{description}</Description> : null}
    </Select>
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
