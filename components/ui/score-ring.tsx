"use client";

import { useEffect } from "react";

import { playFeedbackSound } from "@/components/feedback-sound";

import type { CSSProperties } from "react";

interface ScoreRingProps {
  percent: number;
  // Read out instead of the drawing, e.g. "7 trên 10 câu đúng".
  label: string;
}

type ScoreBand = "perfect" | "good" | "low";

// A full score turns the ring green, below half it takes the attention colour.
function scoreBand(percent: number): ScoreBand {
  if (percent >= 100) {
    return "perfect";
  }
  return percent >= 50 ? "good" : "low";
}

function ringStyle(percent: number): CSSProperties {
  return { "--score": Math.max(0, Math.min(100, percent)) } as CSSProperties;
}

// A result as a filled ring that sweeps up to the score once when it appears; a full score
// celebrates with a burst of paper.
export function ScoreRing({ percent, label }: ScoreRingProps) {
  const band = scoreBand(percent);
  // 99.6% must not read as a full score.
  const rounded = Math.min(Math.round(percent), band === "perfect" ? 100 : 99);
  return (
    <div
      className="score-ring"
      data-band={band}
      style={ringStyle(rounded)}
      role="img"
      aria-label={label}
    >
      <span aria-hidden="true">{rounded}%</span>
      {band === "perfect" && <Celebration />}
    </div>
  );
}

const CONFETTI_PIECES = 14;

// Paper pieces burst once from the centre of the positioned element around it; purely decorative
// and off with reduced motion.
export function Celebration() {
  return (
    <div className="celebration" aria-hidden="true">
      {Array.from({ length: CONFETTI_PIECES }, (_, index) => (
        <span key={index} style={{ "--piece": index } as CSSProperties} />
      ))}
    </div>
  );
}

interface PracticeScoreProps {
  correctCount: number;
  totalCount: number;
  // What was counted, e.g. "câu đúng" or "từ đúng".
  unit: string;
  // The longest run of right answers in the session, shown from three in a row.
  bestStreak?: number;
}

function praiseFor(percent: number) {
  if (percent >= 100) {
    return "Tuyệt đối! Không sai câu nào.";
  }
  if (percent >= 80) {
    return "Rất tốt, chỉ còn vài chỗ cần ôn.";
  }
  if (percent >= 50) {
    return "Khá rồi, luyện lại câu sai là chắc hơn.";
  }
  return "Đừng nản, mỗi lần luyện lại sẽ nhớ thêm một ít.";
}

// The end of a self-study session: ring, count, a line of encouragement and the best streak.
export function PracticeScore({
  correctCount,
  totalCount,
  unit,
  bestStreak = 0,
}: PracticeScoreProps) {
  const percent = totalCount ? (correctCount / totalCount) * 100 : 0;
  // A perfect session ends with a short tune; the session's last answer just played its own.
  useEffect(() => {
    if (percent >= 100) {
      playFeedbackSound("complete");
    }
  }, [percent]);
  return (
    <div className="practice-score">
      <ScoreRing percent={percent} label={`${correctCount} trên ${totalCount} ${unit}`} />
      <div>
        <p className="result-score">
          {correctCount}
          <span>
            {" "}
            / {totalCount} {unit}
          </span>
        </p>
        <p className="score-praise">{praiseFor(percent)}</p>
        {bestStreak >= 3 && (
          <p className="small muted">Chuỗi đúng dài nhất: {bestStreak} câu liên tiếp</p>
        )}
      </div>
    </div>
  );
}
