"use client";

import { Button } from "@/components/ui/button";

import type { ChineseLanguageTag, TeachingExample } from "@/lib/teaching-content";

interface ExampleFieldsProps {
  label: string;
  example: TeachingExample;
  languageTag: ChineseLanguageTag;
  onChange: (patch: Partial<TeachingExample>) => void;
  onRemove: () => void;
}

export function ExampleFields({
  label,
  example,
  languageTag,
  onChange,
  onRemove,
}: ExampleFieldsProps) {
  return (
    <div className="teaching-example">
      <input
        aria-label={`${label}: câu tiếng Trung`}
        lang={languageTag}
        value={example.text}
        maxLength={300}
        placeholder="Câu tiếng Trung"
        onChange={(event) => onChange({ text: event.target.value })}
      />
      <input
        aria-label={`${label}: pinyin`}
        value={example.reading}
        maxLength={300}
        placeholder="Pinyin"
        onChange={(event) => onChange({ reading: event.target.value })}
      />
      <input
        aria-label={`${label}: nghĩa tiếng Việt`}
        value={example.meaning}
        maxLength={300}
        placeholder="Nghĩa tiếng Việt"
        onChange={(event) => onChange({ meaning: event.target.value })}
      />
      <Button type="button" variant="ghost" aria-label={`Xóa ${label}`} onClick={onRemove}>
        Xóa
      </Button>
    </div>
  );
}
