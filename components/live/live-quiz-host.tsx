"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  LiveCountdown,
  LiveQuestionText,
  OptionLabel,
  useSecondsLeft,
} from "@/components/live/live-shared";
import { QrCode } from "@/components/slides/slide-qr-panel";
import { Button } from "@/components/ui/button";
import { LIVE_HOST_POLL_MS, LIVE_QUESTION_COUNTS, LIVE_SECONDS } from "@/lib/live-quiz";

import type { LiveAction } from "@/lib/live-quiz";
import type { LiveHostState } from "@/lib/server/live-quiz";

export interface LiveQuizSetup {
  classId: string;
  lessonId: string;
  eligible: number;
  openQuizId: string | null;
}

interface LiveQuizHostProps {
  setup: LiveQuizSetup;
  onClose: () => void;
}

const ERROR_TEXT: Record<string, string> = {
  no_questions: "Bài này chưa có câu chọn một đáp án để thi đấu.",
  not_found: "Không tìm thấy phòng thi đấu này.",
  invalid_origin: "Phiên làm việc không hợp lệ. Tải lại trang rồi thử lại.",
  unauthenticated: "Phiên đăng nhập đã hết. Đăng nhập lại rồi thử lại.",
};

// The round over the shared slide: the class sees the code to join, each question with its
// clock, then the answer, how the class answered and the leaderboard.
export function LiveQuizHost({ setup, onClose }: LiveQuizHostProps) {
  const [quizId, setQuizId] = useState(setup.openQuizId);
  const [state, setState] = useState<LiveHostState | null>(null);
  const [count, setCount] = useState<number>(
    LIVE_QUESTION_COUNTS.find((option) => option >= Math.min(10, setup.eligible)) ?? 5,
  );
  const [seconds, setSeconds] = useState<number>(20);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const pendingRevision = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    if (!quizId) {
      return;
    }
    try {
      const response = await fetch(`/api/live/${quizId}/host`, { cache: "no-store" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { code?: string };
        setError(ERROR_TEXT[body.code ?? ""] ?? "Mất kết nối với phòng thi đấu. Đang thử lại…");
        return;
      }
      setError("");
      setState((await response.json()) as LiveHostState);
    } catch {
      setError("Mất kết nối với phòng thi đấu. Đang thử lại…");
    }
  }, [quizId]);

  useEffect(() => {
    if (!quizId) {
      return;
    }
    const first = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), LIVE_HOST_POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [quizId, refresh]);

  const act = useCallback(
    async (action: LiveAction) => {
      if (!state || pendingRevision.current === state.revision) {
        return;
      }
      pendingRevision.current = state.revision;
      setIsBusy(true);
      try {
        const response = await fetch(`/api/live/${state.id}/host`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ revision: state.revision, action }),
        });
        // A conflict means another tab moved the round already; the next read shows where.
        if (!response.ok && response.status !== 409) {
          setError("Chưa chuyển được. Bấm lại nhé.");
          pendingRevision.current = null;
        }
        await refresh();
      } catch {
        setError("Chưa chuyển được. Bấm lại nhé.");
        pendingRevision.current = null;
      } finally {
        setIsBusy(false);
      }
    },
    [refresh, state],
  );

  const secondsLeft = useSecondsLeft(
    state?.phase === "question" ? state.startedAt : null,
    state?.seconds ?? 0,
    state?.serverNow ?? null,
  );
  const everyoneAnswered =
    state?.phase === "question" &&
    state.players.length > 0 &&
    state.answeredCount >= state.players.length;
  // The answer shows by itself when time is up or the whole class has answered.
  useEffect(() => {
    if (state?.phase === "question" && (secondsLeft === 0 || everyoneAnswered)) {
      const timer = setTimeout(() => void act("reveal"), 0);
      return () => clearTimeout(timer);
    }
  }, [act, everyoneAnswered, secondsLeft, state?.phase]);

  async function open() {
    setIsBusy(true);
    setError("");
    try {
      const response = await fetch("/api/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: setup.classId, lessonId: setup.lessonId, count, seconds }),
      });
      const body = (await response.json().catch(() => ({}))) as { id?: string; code?: string };
      if (!response.ok || !body.id) {
        setError(ERROR_TEXT[body.code ?? ""] ?? "Chưa mở được phòng thi đấu. Thử lại nhé.");
        return;
      }
      pendingRevision.current = null;
      setQuizId(body.id);
    } catch {
      setError("Chưa mở được phòng thi đấu. Thử lại nhé.");
    } finally {
      setIsBusy(false);
    }
  }

  function startOver() {
    setQuizId(null);
    setState(null);
    pendingRevision.current = null;
  }

  const header = (
    <div className="live-host-header">
      <h2 id="live-host-title">Thi đấu cả lớp</h2>
      {state && state.phase !== "lobby" && state.phase !== "finished" && (
        <span className="live-progress">
          Câu {state.index + 1}/{state.total}
        </span>
      )}
      <Button variant="ghost" onClick={onClose}>
        Về slide
      </Button>
    </div>
  );

  let body;
  if (!quizId) {
    body = setup.eligible ? (
      <div className="live-setup">
        <p>
          Bài này có {setup.eligible} câu chọn một đáp án. Học viên của lớp quét mã để vào phòng và
          trả lời trên điện thoại; trả lời đúng và nhanh được nhiều điểm hơn.
        </p>
        <fieldset>
          <legend>Số câu</legend>
          <div className="live-choice-row">
            {LIVE_QUESTION_COUNTS.map((option) => (
              <Button
                key={option}
                variant={count === option ? "default" : "outline"}
                aria-pressed={count === option}
                onClick={() => setCount(option)}
              >
                {Math.min(option, setup.eligible)} câu
              </Button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Thời gian mỗi câu</legend>
          <div className="live-choice-row">
            {LIVE_SECONDS.map((option) => (
              <Button
                key={option}
                variant={seconds === option ? "default" : "outline"}
                aria-pressed={seconds === option}
                onClick={() => setSeconds(option)}
              >
                {option} giây
              </Button>
            ))}
          </div>
        </fieldset>
        <Button onClick={open} disabled={isBusy}>
          Mở phòng thi đấu
        </Button>
      </div>
    ) : (
      <p className="live-setup">{ERROR_TEXT.no_questions}</p>
    );
  } else if (!state) {
    body = <p className="live-setup">Đang mở phòng…</p>;
  } else if (state.phase === "lobby") {
    body = (
      <div className="live-lobby">
        <QrCode text={state.joinUrl} label="Mã QR vào phòng thi đấu" />
        <div className="live-lobby-text">
          <p className="live-big">Quét mã để vào phòng</p>
          <p className="live-url">{state.joinUrl.replace(/^https?:\/\//, "")}</p>
          <p>
            {state.players.length
              ? `${state.players.length} học viên đã vào:`
              : "Chưa có học viên nào vào phòng."}
          </p>
          <ul className="live-names">
            {state.players.map((player, index) => (
              <li key={`${player.name}-${index}`}>{player.name}</li>
            ))}
          </ul>
          <div className="live-actions">
            <Button onClick={() => act("start")} disabled={isBusy || !state.players.length}>
              Bắt đầu
            </Button>
            <Button variant="outline" onClick={() => act("finish")} disabled={isBusy}>
              Hủy phòng
            </Button>
          </div>
        </div>
      </div>
    );
  } else if (state.phase === "question" && state.question) {
    body = (
      <div className="live-question" lang={state.lang}>
        {secondsLeft !== null && <LiveCountdown secondsLeft={secondsLeft} total={state.seconds} />}
        <LiveQuestionText instruction={state.question.instruction} prompt={state.question.prompt} />
        <ol className="live-options">
          {state.question.options.map((option, index) => (
            <li key={index} className="live-option" data-option={index}>
              <OptionLabel index={index} text={option} />
            </li>
          ))}
        </ol>
        <div className="live-actions">
          <span aria-live="polite">
            Đã trả lời {state.answeredCount}/{state.players.length}
          </span>
          <Button onClick={() => act("reveal")} disabled={isBusy}>
            Hiện đáp án
          </Button>
        </div>
      </div>
    );
  } else if (state.phase === "reveal" && state.question) {
    const answer = state.question.answer;
    const most = Math.max(1, ...(state.counts ?? []));
    body = (
      <div className="live-question live-reveal" lang={state.lang}>
        <LiveQuestionText instruction={state.question.instruction} prompt={state.question.prompt} />
        <ol className="live-options">
          {state.question.options.map((option, index) => (
            <li
              key={index}
              className="live-option"
              data-option={index}
              data-correct={index === answer}
            >
              <OptionLabel
                index={index}
                text={option}
                tag={index === answer ? "✓ Đáp án" : undefined}
              />
              <span className="live-option-count">
                <span
                  className="live-option-bar"
                  style={{ width: `${((state.counts?.[index] ?? 0) / most) * 100}%` }}
                />
                {state.counts?.[index] ?? 0}
              </span>
            </li>
          ))}
        </ol>
        <div className="live-reveal-foot">
          {state.question.explain && (
            <p className="live-explain" lang="vi">
              {state.question.explain}
            </p>
          )}
          <Standings rows={state.standings.slice(0, 5)} />
        </div>
        <div className="live-actions">
          <Button onClick={() => act("next")} disabled={isBusy}>
            {state.index + 1 < state.total ? "Câu tiếp" : "Xem kết quả"}
          </Button>
          <Button variant="outline" onClick={() => act("finish")} disabled={isBusy}>
            Kết thúc sớm
          </Button>
        </div>
      </div>
    );
  } else {
    body = (
      <div className="live-finished">
        <p className="live-big">Kết quả</p>
        {state.standings.length ? <Standings rows={state.standings} /> : <p>Phòng đã đóng.</p>}
        <div className="live-actions">
          <Button onClick={startOver}>Thi đấu lượt mới</Button>
          <Button variant="outline" onClick={onClose}>
            Về slide
          </Button>
        </div>
      </div>
    );
  }

  return (
    <section className="live-host" aria-labelledby="live-host-title">
      <div className="live-host-card">
        {header}
        {body}
        {error && (
          <p role="status" className="live-error">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}

function Standings({ rows }: { rows: LiveHostState["standings"] }) {
  if (!rows.length) {
    return null;
  }
  return (
    <ol className="live-standings" aria-label="Bảng xếp hạng">
      {rows.map((row, index) => (
        <li key={`${row.name}-${index}`} data-rank={row.rank}>
          <span className="live-rank">{row.rank}</span>
          <span className="live-standing-name">{row.name}</span>
          <span className="live-standing-points">{row.points} điểm</span>
        </li>
      ))}
    </ol>
  );
}
