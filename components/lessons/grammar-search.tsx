"use client";

import { useState } from "react";
import Link from "next/link";

import { JapaneseText } from "@/components/lessons/japanese-text";

import type { GrammarEntry } from "@/lib/grammar-search";

interface GrammarSearchProps {
  entries: GrammarEntry[];
  heading?: string;
  intro?: string;
  backHref?: string;
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFKC")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
}

export function GrammarSearch({
  entries,
  heading = "Tra cứu ngữ pháp tiếng Nhật",
  intro = "Tìm mẫu câu bằng tiếng Nhật hoặc nghĩa tiếng Việt.",
  backHref,
}: GrammarSearchProps) {
  const [query, setQuery] = useState("");
  const needle = normalizeSearch(query.trim());
  const results = entries.filter((entry) =>
    normalizeSearch(`${entry.pattern} ${entry.vi} ${entry.explain} ${entry.lessonTitle}`).includes(
      needle,
    ),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{heading}</h1>
          <p>
            {intro}
            {backHref && (
              <>
                {" "}
                <Link href={backHref}>Về trang lớp</Link>
              </>
            )}
          </p>
        </div>
      </div>
      <div className="field grammar-search">
        <label htmlFor="grammar-query">Từ khóa</label>
        <input
          id="grammar-query"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ví dụ: đi đến, です, どこ"
        />
      </div>
      <p role="status" className="small muted">
        Tìm thấy {results.length} mẫu câu.
      </p>
      <div className="grammar-results">
        {results.map((entry) => (
          <article className="grammar-block" key={entry.key}>
            {/* Patterns and notes carry {漢字|かんじ} furigana marks, drawn as in the reader. */}
            <h2 lang="ja" className="japanese-text">
              <JapaneseText text={entry.pattern} />
            </h2>
            <p>
              <JapaneseText text={entry.vi} />
            </p>
            <p>
              <JapaneseText text={entry.explain} />
            </p>
            <Link href={entry.href}>{entry.lessonTitle}</Link>
          </article>
        ))}
      </div>
      {results.length === 0 && <p>Chưa tìm thấy mẫu phù hợp. Thử một từ khóa ngắn hơn nhé.</p>}
    </>
  );
}
