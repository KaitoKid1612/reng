"use client";

import { useState } from "react";
import Link from "next/link";

import { useAudio } from "@/components/audio-provider";
import { KanaCharacterDetails } from "@/components/kana/kana-character-details";
import { KanaGrid } from "@/components/kana/kana-grid";
import { buttonVariants } from "@/components/ui/button";
import { KANA_GROUPS, KANA_SCRIPTS } from "@/lib/kana";

import type { KanaItem, KanaScript } from "@/lib/kana";

interface KanaChartProps {
  items: KanaItem[];
}

export function KanaChart({ items }: KanaChartProps) {
  const [selectedScript, setSelectedScript] = useState<KanaScript>("hiragana");
  const [selectedItem, setSelectedItem] = useState<KanaItem | null>(null);
  const audio = useAudio();

  function handleScriptChange(script: KanaScript) {
    audio.reset();
    setSelectedItem(null);
    setSelectedScript(script);
  }

  function handleItemSelect(item: KanaItem) {
    setSelectedItem(item);
    audio.play(item);
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Bảng chữ cái</h1>
          <p>Nhìn chữ, nghe âm và bắt đầu làm quen với tiếng Nhật.</p>
        </div>
        <Link href={`/kana/practice?script=${selectedScript}`} className={buttonVariants()}>
          Luyện hệ chữ này
        </Link>
      </div>
      <div className="segmented" role="group" aria-label="Hệ chữ">
        {KANA_SCRIPTS.map((script) => (
          <button
            key={script}
            type="button"
            aria-pressed={selectedScript === script}
            onClick={() => handleScriptChange(script)}
          >
            <span lang="ja">{script === "hiragana" ? "あ" : "ア"}</span>
            {script === "hiragana" ? "Hiragana" : "Katakana"}
          </button>
        ))}
      </div>
      <div className="chart-layout">
        <KanaCharacterDetails script={selectedScript} selectedItem={selectedItem} />
        <div className="character-tables">
          {KANA_GROUPS.map((group) => (
            <KanaGrid
              key={group}
              group={group}
              items={items.filter((item) => item.script === selectedScript && item.group === group)}
              selectedId={selectedItem?.id}
              onSelect={handleItemSelect}
            />
          ))}
        </div>
      </div>
    </>
  );
}
