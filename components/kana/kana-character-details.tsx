import { Volume2 } from "lucide-react";

import { AudioStatus, useAudio } from "@/components/audio-provider";
import { Button } from "@/components/ui/button";

import type { KanaItem, KanaScript } from "@/lib/kana";

interface KanaCharacterDetailsProps {
  script: KanaScript;
  selectedItem: KanaItem | null;
}

export function KanaCharacterDetails({ script, selectedItem }: KanaCharacterDetailsProps) {
  const audio = useAudio();
  const placeholder = script === "hiragana" ? "あ" : "ア";

  function handleReplay() {
    if (selectedItem) {
      audio.play(selectedItem);
    }
  }

  return (
    <aside className="character-detail" aria-label="Chi tiết chữ đã chọn">
      <div className="writing-square detail-square" aria-hidden="true">
        <span lang="ja" className="kana-font">
          {selectedItem?.kana || placeholder}
        </span>
      </div>
      {selectedItem ? (
        <>
          <p className="detail-romaji">{selectedItem.acceptedRomaji[0]}</p>
          <p className="muted">
            {selectedItem.acceptedRomaji.length > 1
              ? `Cũng chấp nhận: ${selectedItem.acceptedRomaji.slice(1).join(", ")}`
              : "Đọc thành một âm ngắn, rõ."}
          </p>
          <Button variant="outline" onClick={handleReplay}>
            <Volume2 size={18} aria-hidden="true" />
            Nghe lại
          </Button>
        </>
      ) : (
        <p>Chọn một chữ trong bảng để xem cách đọc và nghe phát âm.</p>
      )}
      <AudioStatus />
      <p className="small muted">
        Chưa có MP3? Trang sẽ thử giọng Nhật có sẵn trên thiết bị. Chất lượng phụ thuộc thiết bị của
        bạn.
      </p>
    </aside>
  );
}
