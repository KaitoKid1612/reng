"use client";

import { useActionState } from "react";

import { joinClassAction } from "@/app/actions/classes";
import { Button } from "@/components/ui/button";

interface JoinClassFormProps {
  initialCode: string;
}

export function JoinClassForm({ initialCode }: JoinClassFormProps) {
  const [state, action, isPending] = useActionState(joinClassAction, {});
  return (
    <form action={action} className="form-card">
      <div className="field">
        <label htmlFor="code">Mã lớp</label>
        <input
          id="code"
          name="code"
          defaultValue={initialCode}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          required
          maxLength={12}
          placeholder="ABCD-EFGH"
          aria-describedby="code-hint"
        />
        <p id="code-hint" className="small muted">
          8 ký tự, không phân biệt chữ hoa/thường; có thể bỏ dấu gạch.
        </p>
      </div>
      {state.error && (
        <p role="alert" className="error-text">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Đang vào lớp…" : "Vào lớp"}
      </Button>
    </form>
  );
}
