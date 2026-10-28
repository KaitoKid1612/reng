import { KANA_GROUP_LABELS } from "@/lib/kana";
import { cn } from "@/lib/utils";

import type { KanaGroup, KanaItem } from "@/lib/kana";

interface KanaGridProps {
  group: KanaGroup;
  items: KanaItem[];
  selectedId: string | undefined;
  onSelect: (item: KanaItem) => void;
}

export function KanaGrid({ group, items, selectedId, onSelect }: KanaGridProps) {
  const columnCount = group === "yoon" ? 3 : 5;
  const rowCount = Math.max(...items.map((item) => item.row)) + 1;

  return (
    <section className="kana-section" aria-labelledby={`title-${group}`}>
      <div className="section-heading">
        <h2 id={`title-${group}`}>{KANA_GROUP_LABELS[group]}</h2>
        <span className="small muted">
          {items.length} {group === "yoon" ? "âm" : "chữ"}
        </span>
      </div>
      <div className={cn("kana-grid", group === "yoon" && "kana-grid-yoon")}>
        {Array.from({ length: rowCount * columnCount }, (_, index) => {
          const item = items.find(
            (candidate) =>
              candidate.row === Math.floor(index / columnCount) &&
              candidate.column === index % columnCount,
          );

          if (!item) {
            return <span key={`blank-${index}`} className="kana-empty" aria-hidden="true" />;
          }

          return (
            <button
              key={item.id}
              type="button"
              className="kana-cell writing-square"
              aria-label={`${item.kana}, ${item.acceptedRomaji[0]}`}
              aria-pressed={selectedId === item.id}
              onClick={() => onSelect(item)}
            >
              <span lang="ja" className="kana-font">
                {item.kana}
              </span>
              <span className="cell-romaji">{item.acceptedRomaji[0]}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
