"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { GrammarExplain } from "@/components/lessons/grammar-explain";
import { JapaneseText } from "@/components/lessons/japanese-text";
import { PronunciationButton } from "@/components/lessons/pronunciation-button";
import { groupByTopic, topicTitleOf } from "@/lib/grammar-topics";
import { toPlainJapanese, toSpeechText } from "@/lib/japanese-text";

import type { GrammarEntry } from "@/lib/grammar-search";
import type { TopicComparison } from "@/lib/grammar-topics";

interface GrammarSearchProps {
  entries: GrammarEntry[];
  heading?: string;
  intro?: string;
  backHref?: string;
}

type View = "topic" | "lesson";

// A short result list opens by itself: whoever typed a pattern wants to read it, not click again.
const AUTO_OPEN_LIMIT = 3;
// The reader's last view, a per-browser convenience. Storage may be blocked, so the choice made
// on this page is also kept in memory; the server and the first paint use the topic view.
const VIEW_STORAGE_KEY = "reng-grammar-view";
let chosenView: View | undefined;
const viewListeners = new Set<() => void>();

function readView(): View {
  if (chosenView) {
    return chosenView;
  }
  try {
    return window.localStorage.getItem(VIEW_STORAGE_KEY) === "lesson" ? "lesson" : "topic";
  } catch {
    return "topic";
  }
}

function subscribeView(listener: () => void) {
  viewListeners.add(listener);
  return () => {
    viewListeners.delete(listener);
  };
}

function chooseView(next: View) {
  chosenView = next;
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, next);
  } catch {
    // Not remembered for next time; the choice still applies now.
  }
  for (const listener of viewListeners) {
    listener();
  }
}

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
  // searched: 見える and みえる find it. The topic title is searched too ("có lẽ" finds the whole
  // guessing topic); the lesson title is not, or "khả năng" would list every point of the lesson
  // named after it, whatever it teaches.
  const text = `${entry.pattern} ${entry.vi} ${entry.explain}`;
  return normalizeSearch(
    `${text} ${toPlainJapanese(text)} ${toSpeechText(text)} ${topicTitleOf(entry.topicKey)}`,
  );
}

interface PointView {
  entry: GrammarEntry;
  others: GrammarEntry[];
}

interface Group {
  id: string;
  title: string;
  summary?: string;
  points: PointView[];
  comparison?: TopicComparison;
}

function groupByLesson(entries: readonly GrammarEntry[]) {
  const groups: Group[] = [];
  for (const entry of entries) {
    const last = groups.at(-1);
    if (last?.id === entry.lessonId) {
      last.points.push({ entry, others: [] });
    } else {
      groups.push({
        id: entry.lessonId,
        title: entry.lessonTitle,
        points: [{ entry, others: [] }],
      });
    }
  }
  return groups;
}

function Comparison({ comparison }: { comparison: TopicComparison }) {
  return (
    <div className="grammar-ref-compare">
      <h3>{comparison.title}</h3>
      <table>
        <thead>
          <tr>
            {comparison.columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {comparison.rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, index) =>
                index === 0 ? (
                  <th key={index} scope="row" data-label={comparison.columns[index]}>
                    <JapaneseText text={cell} />
                  </th>
                ) : (
                  <td key={index} data-label={comparison.columns[index]}>
                    <JapaneseText text={cell} />
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="grammar-ref-tip">
        <strong>Mẹo nhớ:</strong> <JapaneseText text={comparison.tip} />
      </p>
    </div>
  );
}

interface GrammarPointProps {
  point: PointView;
  open: boolean;
  showLesson: boolean;
}

function GrammarPoint({ point: { entry, others }, open, showLesson }: GrammarPointProps) {
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
          {showLesson && <span className="grammar-ref-lesson">{entry.lessonTitle}</span>}
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
          Trong bài{" "}
          <Link href={entry.href} aria-label={`${entry.lessonTitle}, mẫu ${plainPattern}`}>
            {entry.lessonTitle}
          </Link>
          {others.length > 0 && (
            <>
              {"; cũng có ở "}
              {others.map((other, index) => (
                <span key={other.key}>
                  {index > 0 && ", "}
                  <Link href={other.href}>{other.lessonTitle}</Link>
                </span>
              ))}
            </>
          )}
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
  const view = useSyncExternalStore(subscribeView, readView, () => "topic" as const);
  const [query, setQuery] = useState("");
  // The topic or lesson the reader narrowed to; each view keeps its own.
  const [filters, setFilters] = useState<Record<View, string>>({ topic: "", lesson: "" });
  const indexed = useMemo(
    () => entries.map((entry) => ({ entry, text: searchText(entry) })),
    [entries],
  );
  // Filter options come from everything the reader has, not from the current search.
  const options = useMemo(
    () =>
      view === "topic"
        ? groupByTopic(entries).map((group) => ({
            id: group.id,
            label: `${group.title} (${group.points.length})`,
          }))
        : groupByLesson(entries).map((group) => ({
            id: group.id,
            label: `${group.title} (${group.points.length})`,
          })),
    [entries, view],
  );
  const needle = normalizeSearch(query.trim());
  const matches = indexed.filter(({ text }) => text.includes(needle)).map(({ entry }) => entry);
  const filter = filters[view];
  const groups: Group[] =
    view === "topic"
      ? groupByTopic(matches, entries).filter((group) => !filter || group.id === filter)
      : groupByLesson(matches.filter((entry) => !filter || entry.lessonId === filter));
  const count = groups.reduce((total, group) => total + group.points.length, 0);
  const autoOpen = count <= AUTO_OPEN_LIMIT;
  const filterLabel = view === "topic" ? "Chủ đề" : "Bài";
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
      <div className="segmented grammar-ref-views" role="group" aria-label="Xếp mẫu câu">
        <button type="button" aria-pressed={view === "topic"} onClick={() => chooseView("topic")}>
          Theo chủ đề
        </button>
        <button type="button" aria-pressed={view === "lesson"} onClick={() => chooseView("lesson")}>
          Theo bài
        </button>
      </div>
      <div className="grammar-ref-filters">
        <div className="field grammar-ref-query">
          <label htmlFor="grammar-query">Từ khóa</label>
          <input
            id="grammar-query"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ví dụ: có lẽ, đi đến, です, どこ"
          />
        </div>
        {options.length > 1 && (
          <div className="field grammar-ref-filter">
            <label htmlFor="grammar-filter">{filterLabel}</label>
            <select
              id="grammar-filter"
              value={filter}
              onChange={(event) => setFilters({ ...filters, [view]: event.target.value })}
            >
              <option value="">{view === "topic" ? "Tất cả chủ đề" : "Tất cả bài"}</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <p role="status" className="small muted">
        Tìm thấy {count} mẫu câu.
      </p>
      <div className="grammar-ref-groups">
        {groups.map((group) => (
          <section
            key={group.id}
            className="grammar-ref-group"
            aria-labelledby={`grammar-group-${group.id}`}
          >
            <h2 id={`grammar-group-${group.id}`}>{group.title}</h2>
            {group.summary && <p className="grammar-ref-group-summary">{group.summary}</p>}
            {group.comparison && <Comparison comparison={group.comparison} />}
            {group.points.map((point) => (
              // Remounting when the list becomes short (or long) applies the automatic opening
              // once; afterwards each point keeps whatever the reader opened or closed.
              <GrammarPoint
                key={`${point.entry.key}:${autoOpen}`}
                point={point}
                open={autoOpen}
                showLesson={view === "topic"}
              />
            ))}
          </section>
        ))}
      </div>
      {count === 0 && <p>Chưa tìm thấy mẫu phù hợp. Thử một từ khóa ngắn hơn nhé.</p>}
    </>
  );
}
