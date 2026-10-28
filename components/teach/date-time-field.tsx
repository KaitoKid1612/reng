"use client";

import { useState } from "react";

import { fromVietnamInput, toVietnamInput } from "@/lib/vietnam-time";

interface DateTimeFieldProps {
  id: string;
  name: string;
  label: string;
  initialValue: string;
  isRequired: boolean;
  hint?: string;
}

// datetime-local has no time zone; the hidden field carries the instant in ISO format.
export function DateTimeField({
  id,
  name,
  label,
  initialValue,
  isRequired,
  hint,
}: DateTimeFieldProps) {
  const [value, setValue] = useState(() => toVietnamInput(initialValue));
  return (
    <div className="field">
      <label htmlFor={id}>{label} (giờ Việt Nam)</label>
      <input
        id={id}
        type="datetime-local"
        value={value}
        required={isRequired}
        onChange={(event) => setValue(event.target.value)}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      <input type="hidden" name={name} value={value ? fromVietnamInput(value) : ""} />
      {hint && (
        <p id={`${id}-hint`} className="small muted">
          {hint}
        </p>
      )}
    </div>
  );
}
