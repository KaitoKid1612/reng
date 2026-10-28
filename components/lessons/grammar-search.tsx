"use client";

import { useState } from "react";
import Link from "next/link";

import type { PublicLesson } from "@/lib/lesson-schema";

interface GrammarSearchProps {
  lessons: PublicLesson[];
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFKC")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
}

export function GrammarSearch({ lessons }: GrammarSearchProps) {
  const [query, setQuery] = useState("");
  const results = lessons
    .flatMap((lesson) => lesson.content.grammar.map((grammar) => ({ grammar, lesson })))
    .filter(({ grammar, lesson }) =>
      normalizeSearch(
        `${grammar.pattern} ${grammar.vi} ${grammar.explain} ${lesson.title}`,
      ).includes(normalizeSearch(query.trim())),
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Tra cứu ngữ pháp</h1>
          <p>Tìm mẫu câu bằng tiếng Nhật hoặc nghĩa tiếng Việt.</p>
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
        {results.map(({ grammar, lesson }) => (
          <article className="grammar-block" key={`${lesson.id}:${grammar.id}`}>
            <h2 lang="ja" className="japanese-text">
              {grammar.pattern}
            </h2>
            <p>{grammar.vi}</p>
            <p>{grammar.explain}</p>
            <Link href={`/lessons/${lesson.lessonId}?version=${lesson.id}#${grammar.id}`}>
              {lesson.title}
            </Link>
          </article>
        ))}
      </div>
      {results.length === 0 && <p>Chưa tìm thấy mẫu phù hợp. Thử một từ khóa ngắn hơn nhé.</p>}
    </>
  );
}
