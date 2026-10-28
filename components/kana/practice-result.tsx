import { Button } from "@/components/ui/button";

import type { PracticeMistake } from "@/lib/kana";

interface PracticeResultProps {
  mistakes: PracticeMistake[];
  totalCount: number;
  onRetryMistakes: () => void;
  onReset: () => void;
}

export function PracticeResult({
  mistakes,
  totalCount,
  onRetryMistakes,
  onReset,
}: PracticeResultProps) {
  return (
    <div className="practice-result">
      <h1>Bạn đã hoàn thành phiên luyện</h1>
      <p className="result-score">
        {totalCount - mistakes.length}
        <span> / {totalCount} câu đúng</span>
      </p>
      <p>
        {mistakes.length > 0
          ? "Ôn lại những chữ dưới đây để nhớ chắc hơn."
          : "Bạn đã đọc đúng tất cả các chữ trong phiên này."}
      </p>
      {mistakes.length > 0 && (
        <ul className="mistake-list">
          {mistakes.map(({ item, raw }) => (
            <li key={item.id}>
              <span lang="ja" className="kana-font">
                {item.kana}
              </span>
              <span>
                <span className="muted">Bạn nhập: {raw}</span>
                <br />
                Cách đọc: {item.acceptedRomaji.join(" / ")}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="button-row">
        {mistakes.length > 0 && <Button onClick={onRetryMistakes}>Luyện lại câu sai</Button>}
        <Button variant="outline" onClick={onReset}>
          Chọn phiên mới
        </Button>
      </div>
    </div>
  );
}
