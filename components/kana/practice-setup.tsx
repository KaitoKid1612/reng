import { Button } from "@/components/ui/button";
import { KANA_GROUP_LABELS, KANA_GROUPS, KANA_SCRIPTS } from "@/lib/kana";

import type { KanaGroup, KanaScript } from "@/lib/kana";
import type { FormEvent } from "react";

export interface PracticeConfiguration {
  script: KanaScript;
  groups: KanaGroup[];
  questionCount: string;
}

interface PracticeSetupProps {
  configuration: PracticeConfiguration;
  availableCount: number;
  onConfigurationChange: (configuration: PracticeConfiguration) => void;
  onStart: () => void;
}

export function PracticeSetup({
  configuration,
  availableCount,
  onConfigurationChange,
  onStart,
}: PracticeSetupProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (availableCount > 0) {
      onStart();
    }
  }

  function handleGroupChange(group: KanaGroup, isSelected: boolean) {
    const selectedGroups = isSelected
      ? [...configuration.groups, group]
      : configuration.groups.filter((selectedGroup) => selectedGroup !== group);

    onConfigurationChange({ ...configuration, groups: selectedGroups });
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Luyện đọc kana</h1>
          <p>Nhìn chữ và gõ cách đọc bằng romaji. Mỗi lần luyện một chút.</p>
        </div>
      </div>
      <form className="practice-setup" onSubmit={handleSubmit}>
        <fieldset>
          <legend>Chọn hệ chữ</legend>
          <div className="option-row">
            {KANA_SCRIPTS.map((script) => (
              <label className="choice-label" key={script}>
                <input
                  type="radio"
                  name="script"
                  value={script}
                  checked={configuration.script === script}
                  onChange={() => onConfigurationChange({ ...configuration, script })}
                />
                {script === "hiragana" ? "Hiragana" : "Katakana"}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Bạn muốn ôn nhóm nào?</legend>
          <div className="group-options">
            {KANA_GROUPS.map((group) => (
              <label className="choice-label" key={group}>
                <input
                  type="checkbox"
                  checked={configuration.groups.includes(group)}
                  onChange={(event) => handleGroupChange(group, event.target.checked)}
                />
                {KANA_GROUP_LABELS[group]}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="field">
          <label htmlFor="count">Số câu mỗi phiên</label>
          <select
            id="count"
            value={configuration.questionCount}
            onChange={(event) =>
              onConfigurationChange({ ...configuration, questionCount: event.target.value })
            }
          >
            <option value="10">10 câu</option>
            <option value="20">20 câu</option>
            <option value="all">Toàn bộ nhóm đã chọn</option>
          </select>
        </div>
        <p className="small muted">
          {availableCount > 0
            ? `Có ${availableCount} chữ trong phạm vi đã chọn. Mỗi chữ xuất hiện một lần trong phiên.`
            : "Chọn ít nhất một nhóm để bắt đầu."}
        </p>
        <Button type="submit" disabled={availableCount === 0}>
          Bắt đầu luyện
        </Button>
        <p className="small muted">Phiên luyện chưa lưu tiến độ. Tải lại trang sẽ bắt đầu lại.</p>
      </form>
    </>
  );
}
