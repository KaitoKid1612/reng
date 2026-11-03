"use client";

import { Button } from "@/components/ui/button";
import { joinOrderTokens } from "@/lib/assignment";

import type { OrderToken } from "@/lib/assignment";

interface OrderFieldProps {
  tokens: OrderToken[];
  value: string[];
  lang: string;
  isDisabled: boolean;
  onValueChange: (value: string[]) => void;
}

// Learners tap the pieces in sentence order and tap a placed piece to send it back. Plain
// buttons keep this usable with a keyboard, a screen reader and a phone, without dragging.
export function OrderField({ tokens, value, lang, isDisabled, onValueChange }: OrderFieldProps) {
  const placed = value
    .map((id) => tokens.find((token) => token.id === id))
    .filter((token): token is OrderToken => token !== undefined);
  const remaining = tokens.filter((token) => !value.includes(token.id));
  return (
    <div className="order-field">
      <div className="order-answer" role="group" aria-label="Câu đang xếp, bấm một mảnh để bỏ">
        {placed.length ? (
          placed.map((token) => (
            <button
              key={token.id}
              type="button"
              className="order-token"
              lang={lang}
              disabled={isDisabled}
              onClick={() => onValueChange(value.filter((id) => id !== token.id))}
            >
              {token.text}
            </button>
          ))
        ) : (
          <span className="small muted">Bấm các mảnh bên dưới theo đúng thứ tự câu.</span>
        )}
      </div>
      <p className="visually-hidden" aria-live="polite">
        {placed.length ? `Câu đang xếp: ${joinOrderTokens(placed.map((token) => token.text))}` : ""}
      </p>
      <div className="order-bank" role="group" aria-label="Các mảnh còn lại">
        {remaining.map((token) => (
          <button
            key={token.id}
            type="button"
            className="order-token"
            lang={lang}
            disabled={isDisabled}
            onClick={() => onValueChange([...value, token.id])}
          >
            {token.text}
          </button>
        ))}
      </div>
      {placed.length > 0 && !isDisabled && (
        <Button variant="ghost" onClick={() => onValueChange([])}>
          Xếp lại từ đầu
        </Button>
      )}
    </div>
  );
}
