"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { GrammarExplain } from "@/components/lessons/grammar-explain";
import { JapaneseText } from "@/components/lessons/japanese-text";
import { PronunciationButton } from "@/components/lessons/pronunciation-button";
import { toPlainJapanese, toSpeechText } from "@/lib/japanese-text";

import type { GrammarEntry } from "@/lib/grammar-search";

interface GrammarSearchProps {
  entries: GrammarEntry[];
  heading?: string;
  intro?: string;
  backHref?: string;
}

// A short result list opens by itself: whoever typed a pattern wants to read it, not click again.
const AUTO_OPEN_LIMIT = 3;

function normalizeSearch(value: string) {
  return value
    .normalize("NFKC")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
}

function searchText(entry: GrammarEntry) {
  // Patterns carry furigana marks ({見|み}える), so the written form and the reading are both
  // searched: 見える and みえる find it. The lesson title is left out (the Bài filter covers it), or
  // "khả năng" would list every point of the lesson named after it.
  const text = `${entry.pattern} ${entry.vi} ${entry.explain}`;
  return normalizeSearch(`${text} ${toPlainJapanese(text)} ${toSpeechText(text)}`);
}

interface LessonGroup {
  lessonId: string;
  lessonTitle: string;
  entries: GrammarEntry[];
}

function groupByLesson(entries: readonly GrammarEntry[]) {
  const groups: LessonGroup[] = [];
  for (const entry of entries) {
    const last = groups.at(-1);
    if (last?.lessonId === entry.lessonId) {
      last.entries.push(entry);
    } else {
      groups.push({ lessonId: entry.lessonId, lessonTitle: entry.lessonTitle, entries: [entry] });
    }
  }
  return groups;
}

function GrammarPoint({ entry, open }: { entry: GrammarEntry; open: boolean }) {
  const plainPattern = toPlainJapanese(entry.pattern);
  return (
    <details className="grammar-ref-entry" open={open}>
      <summary className="grammar-ref-summary">
        {/* Patterns and notes carry {漢字|かんじ} furigana marks, drawn as in the reader. */}
        <h3 lang="ja" className="grammar-ref-pattern japanese-text">
          <JapaneseText text={entry.pattern} />
        </h3>
        <p className="grammar-ref-meaning">
          <JapaneseText text={entry.vi} />
        </p>
        <ChevronDown size={20} aria-hidden="true" className="grammar-ref-chevron" />
      </summary>
      <div className="grammar-ref-body">
        <div className="grammar-ref-notes">
          <section className="grammar-ref-part">
            <h4>Cách dùng</h4>
            <GrammarExplain text={entry.explain} />
          </section>
          {entry.mistake && (
            <section className="grammar-ref-part grammar-ref-caution">
              <h4>Dễ nhầm</h4>
              <p>
                <JapaneseText text={entry.mistake} />
              </p>
            </section>
          )}
        </div>
        {entry.examples.length > 0 && (
          <section className="grammar-ref-part grammar-ref-examples">
            <h4>Ví dụ</h4>
            <ol>
              {entry.examples.map((example, index) => (
                <li key={index}>
                  <p lang="ja" className="japanese-text">
                    <JapaneseText text={example.jp} />
                  </p>
                  <p className="grammar-ref-translation">
                    <JapaneseText text={example.vi} />
                  </p>
                  <PronunciationButton
                    id={`${entry.key}:${index}`}
                    text={toSpeechText(example.jp)}
                    label={toPlainJapanese(example.jp)}
                    audio={example.audio}
                  />
                </li>
              ))}
            </ol>
          </section>
        )}
        <p className="grammar-ref-source">
          <Link
            href={entry.href}
            aria-label={`Xem trong bài ${entry.lessonTitle}: ${plainPattern}`}
          >
            Xem trong bài
          </Link>
        </p>
      </div>
    </details>
  );
}

export function GrammarSearch({
  entries,
  heading = "Tra cứu ngữ pháp tiếng Nhật",
  intro = "Tìm mẫu câu bằng tiếng Nhật hoặc nghĩa tiếng Việt.",
  backHref,
}: GrammarSearchProps) {
  const [query, setQuery] = useState("");
  const [lessonId, setLessonId] = useState("");
  const indexed = useMemo(
    () => entries.map((entry) => ({ entry, text: searchText(entry) })),
    [entries],
  );
  const lessons = useMemo(() => groupByLesson(entries), [entries]);
  const needle = normalizeSearch(query.trim());
  const results = indexed
    .filter(
      ({ entry, text }) => (!lessonId || entry.lessonId === lessonId) && text.includes(needle),
    )
    .map(({ entry }) => entry);
  const groups = groupByLesson(results);
  const autoOpen = results.length <= AUTO_OPEN_LIMIT;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{heading}</h1>
          <p>
            {intro} Bấm vào một mẫu để xem cách dùng và ví dụ.
            {backHref && (
              <>
                {" "}
                <Link href={backHref}>Về trang lớp</Link>
              </>
            )}
          </p>
        </div>
      </div>
      <div className="grammar-ref-filters">
        <div className="field grammar-ref-query">
          <label htmlFor="grammar-query">Từ khóa</label>
          <input
            id="grammar-query"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ví dụ: đi đến, です, どこ"
          />
        </div>
        {lessons.length > 1 && (
          <div className="field grammar-ref-lesson">
            <label htmlFor="grammar-lesson">Bài</label>
            <select
              id="grammar-lesson"
              value={lessonId}
              onChange={(event) => setLessonId(event.target.value)}
            >
              <option value="">Tất cả bài</option>
              {lessons.map((lesson) => (
                <option key={lesson.lessonId} value={lesson.lessonId}>
                  {lesson.lessonTitle} ({lesson.entries.length})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <p role="status" className="small muted">
        Tìm thấy {results.length} mẫu câu.
      </p>
      <div className="grammar-ref-groups">
        {groups.map((group) => (
          <section
            key={group.lessonId}
            className="grammar-ref-group"
            aria-labelledby={`grammar-group-${group.lessonId}`}
          >
            <h2 id={`grammar-group-${group.lessonId}`}>{group.lessonTitle}</h2>
            {group.entries.map((entry) => (
              // Remounting when the list becomes short (or long) applies the automatic opening
              // once; afterwards each point keeps whatever the reader opened or closed.
              <GrammarPoint key={`${entry.key}:${autoOpen}`} entry={entry} open={autoOpen} />
            ))}
          </section>
        ))}
      </div>
      {results.length === 0 && <p>Chưa tìm thấy mẫu phù hợp. Thử một từ khóa ngắn hơn nhé.</p>}
    </>
  );
}
