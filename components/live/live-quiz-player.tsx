"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import {
  LiveCountdown,
  LiveQuestionText,
  OptionLabel,
  useSecondsLeft,
} from "@/components/live/live-shared";
import { LIVE_PLAYER_POLL_MS } from "@/lib/live-quiz";

import type { LivePlayerState } from "@/lib/server/live-quiz";

type Status = "joining" | "ready" | "unavailable";

// A learner's phone during the round: join, tap an option, then see right or wrong and where
// they stand when the teacher shows the answer.
export function LiveQuizPlayer({ quizId }: { quizId: string }) {
  const [status, setStatus] = useState<Status>("joining");
  const [state, setState] = useState<LivePlayerState | null>(null);
  const [pick, setPick] = useState<{ index: number; choice: number } | null>(null);
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/live/${quizId}`, { cache: "no-store" });
      if (response.status === 404) {
        setStatus("unavailable");
        return;
      }
      if (!response.ok) {
        setNotice("Mất kết nối. Đang thử lại…");
        return;
      }
      setNotice("");
      setState((await response.json()) as LivePlayerState);
    } catch {
      setNotice("Mất kết nối. Đang thử lại…");
    }
  }, [quizId]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    void (async () => {
      try {
        const response = await fetch(`/api/live/${quizId}/join`, { method: "POST" });
        if (cancelled) {
          return;
        }
        // A round that has finished still shows its result to those who played it.
        if (!response.ok && response.status !== 404) {
          setNotice("Chưa vào được phòng. Đang thử lại…");
        }
        setStatus("ready");
        await refresh();
        timer = setInterval(() => void refresh(), LIVE_PLAYER_POLL_MS);
      } catch {
        if (!cancelled) {
          setNotice("Chưa vào được phòng. Tải lại trang để thử nhé.");
        }
      }
    })();
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [quizId, refresh]);

  const secondsLeft = useSecondsLeft(
    state?.phase === "question" ? state.startedAt : null,
    state?.seconds ?? 0,
    state?.serverNow ?? null,
  );

  async function answer(choice: number) {
    if (!state || state.phase !== "question" || state.myAnswer || pick?.index === state.index) {
      return;
    }
    const index = state.index;
    setPick({ index, choice });
    try {
      const response = await fetch(`/api/live/${quizId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index, choice }),
      });
      if (response.status === 409) {
        setNotice("Hết giờ cho câu này rồi.");
        setPick(null);
      } else if (!response.ok) {
        setNotice("Chưa gửi được câu trả lời. Chọn lại nhé.");
        setPick(null);
      }
      await refresh();
    } catch {
      setNotice("Chưa gửi được câu trả lời. Chọn lại nhé.");
      setPick(null);
    }
  }

  if (status === "unavailable") {
    return (
      <section className="live-player">
        <h1>Thi đấu cả lớp</h1>
        <p>
          Không vào được phòng này: phòng đã đóng, hoặc bạn chưa ở lớp của phòng. Vào lớp bằng mã
          giáo viên gửi rồi quét lại mã thi đấu.
        </p>
        <Link href="/classes">Lớp của tôi</Link>
      </section>
    );
  }
  if (!state) {
    return (
      <section className="live-player">
        <h1>Thi đấu cả lớp</h1>
        <p role="status">{notice || "Đang vào phòng…"}</p>
      </section>
    );
  }

  const chosen =
    state.myAnswer?.choice ?? (pick && pick.index === state.index ? pick.choice : null);
  let body;
  if (state.phase === "lobby") {
    body = <p className="live-big">Đã vào phòng, {state.name}. Chờ giáo viên bắt đầu nhé.</p>;
  } else if (state.phase === "question" && state.question) {
    body = (
      <div lang={state.lang}>
        {secondsLeft !== null && <LiveCountdown secondsLeft={secondsLeft} total={state.seconds} />}
        <LiveQuestionText instruction={state.question.instruction} prompt={state.question.prompt} />
        <div className="live-player-options">
          {state.question.options.map((option, index) => (
            <button
              key={index}
              type="button"
              className="live-option"
              data-option={index}
              aria-pressed={chosen === index}
              disabled={chosen !== null || secondsLeft === 0}
              onClick={() => answer(index)}
            >
              <OptionLabel index={index} text={option} />
            </button>
          ))}
        </div>
        <p role="status" className="live-player-note">
          {chosen !== null ? "Đã gửi. Chờ giáo viên hiện đáp án…" : ""}
        </p>
      </div>
    );
  } else if (state.phase === "reveal" && state.question) {
    const isCorrect = state.myAnswer?.isCorrect;
    const key = state.question.answer;
    const describeOption = (index: number) => {
      if (index === key) {
        return index === chosen ? "✓ Đáp án · bạn chọn" : "✓ Đáp án";
      }
      return index === chosen ? "Bạn chọn" : undefined;
    };
    body = (
      <div lang={state.lang}>
        <p className="live-result" data-correct={isCorrect === true} role="status">
          {describeResult(state.myAnswer)}
        </p>
        <LiveQuestionText instruction={state.question.instruction} prompt={state.question.prompt} />
        <div className="live-player-options">
          {state.question.options.map((option, index) => (
            <div
              key={index}
              className="live-option"
              data-option={index}
              data-correct={index === key}
              data-chosen={index === chosen}
            >
              <OptionLabel index={index} text={option} tag={describeOption(index)} />
            </div>
          ))}
        </div>
        {state.standing && (
          <p className="live-player-note">
            Tổng {state.standing.points} điểm · hạng {state.standing.rank}/{state.standing.players}
          </p>
        )}
      </div>
    );
  } else {
    body = (
      <div>
        <p className="live-big">Kết thúc!</p>
        {state.standing ? (
          <p className="live-result" data-correct={state.standing.rank <= 3}>
            Bạn hạng {state.standing.rank}/{state.standing.players} với {state.standing.points} điểm
            ({state.standing.correct}/{state.total} câu đúng).
          </p>
        ) : null}
        {state.podium.length > 0 && (
          <ol className="live-standings" aria-label="Ba bạn dẫn đầu">
            {state.podium.map((row, index) => (
              <li key={`${row.name}-${index}`} data-rank={row.rank}>
                <span className="live-rank">{row.rank}</span>
                <span className="live-standing-name">{row.name}</span>
                <span className="live-standing-points">{row.points} điểm</span>
              </li>
            ))}
          </ol>
        )}
        <Link href="/classes">Về lớp của tôi</Link>
      </div>
    );
  }

  return (
    <section className="live-player" aria-labelledby="live-player-title">
      <div className="live-player-head">
        <h1 id="live-player-title">Thi đấu cả lớp</h1>
        {state.phase !== "lobby" && state.phase !== "finished" && (
          <span className="live-progress">
            Câu {state.index + 1}/{state.total}
          </span>
        )}
      </div>
      {body}
      {notice && (
        <p role="status" className="live-error">
          {notice}
        </p>
      )}
    </section>
  );
}

function describeResult(answer: LivePlayerState["myAnswer"]) {
  if (!answer) {
    return "Bạn chưa trả lời câu này.";
  }
  return answer.isCorrect ? `Đúng rồi! +${answer.points} điểm` : "Chưa đúng.";
}
