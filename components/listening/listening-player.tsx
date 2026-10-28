"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { lessonAudioUrl } from "@/lib/lesson-audio-url";

interface ListeningPlayerProps {
  audio: string | null;
  maxListens: number | null;
  listenCount: number;
  onListen: () => void;
}

type PlayerState = "idle" | "loading" | "playing" | "paused" | "error";

const LOAD_TIMEOUT_MS = 10_000;
const REWIND_SECONDS = 5;

const STATE_TEXT: Record<PlayerState, string> = {
  idle: "",
  loading: "Đang tải audio…",
  playing: "Đang phát",
  paused: "Đã tạm dừng",
  error:
    "Chưa tải được audio. Kiểm tra mạng rồi bấm Nghe để thử lại; lần lỗi không tính lượt nghe.",
};

// docs/06: no seek bar, a 5-second rewind and a pitch-preserving 0.75x speed. A listen is
// counted only when playback actually starts from the beginning.
export function ListeningPlayer({
  audio,
  maxListens,
  listenCount,
  onListen,
}: ListeningPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fromStartRef = useRef(true);
  const timerRef = useRef<number | null>(null);
  const onListenRef = useRef(onListen);
  const [state, setState] = useState<PlayerState>("idle");
  const [isSlow, setIsSlow] = useState(false);
  const url = lessonAudioUrl(audio);
  const isLimitReached = maxListens !== null && listenCount >= maxListens;

  useEffect(() => {
    onListenRef.current = onListen;
  }, [onListen]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      const element = audioRef.current;
      if (element) {
        element.pause();
        element.removeAttribute("src");
        element.load();
      }
    },
    [],
  );

  function clearTimer() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function fail() {
    clearTimer();
    audioRef.current?.pause();
    // A failed element is discarded so the next attempt reloads the file.
    audioRef.current = null;
    fromStartRef.current = true;
    setState("error");
  }

  function createElement(source: string) {
    const element = new Audio(source);
    element.preload = "auto";
    element.addEventListener("playing", () => {
      clearTimer();
      setState("playing");
      if (fromStartRef.current) {
        fromStartRef.current = false;
        onListenRef.current();
      }
    });
    element.addEventListener("pause", () => {
      setState((current) => (current === "playing" ? "paused" : current));
    });
    element.addEventListener("ended", () => {
      fromStartRef.current = true;
      setState("idle");
    });
    element.addEventListener("error", fail);
    return element;
  }

  function handlePlay() {
    if (!url) {
      return;
    }
    const current = audioRef.current;
    if (current && state === "playing") {
      current.pause();
      return;
    }
    if (fromStartRef.current && isLimitReached) {
      return;
    }
    audioRef.current = current ?? createElement(url);
    audioRef.current.playbackRate = isSlow ? 0.75 : 1;
    audioRef.current.preservesPitch = true;
    setState("loading");
    clearTimer();
    timerRef.current = window.setTimeout(fail, LOAD_TIMEOUT_MS);
    void audioRef.current.play().catch(fail);
  }

  function handleRewind() {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - REWIND_SECONDS);
    }
  }

  function handleSpeed() {
    const next = !isSlow;
    setIsSlow(next);
    if (audioRef.current) {
      audioRef.current.playbackRate = next ? 0.75 : 1;
    }
  }

  if (!url) {
    return <p className="small muted">Câu này chưa có audio.</p>;
  }

  const playLabel = state === "playing" ? "Tạm dừng" : "Nghe";
  return (
    <div className="listening-player">
      <div className="button-row">
        <Button
          variant="outline"
          onClick={handlePlay}
          disabled={state !== "playing" && state !== "paused" && isLimitReached}
        >
          {state === "playing" ? (
            <Pause size={18} aria-hidden="true" />
          ) : (
            <Play size={18} aria-hidden="true" />
          )}
          {playLabel}
        </Button>
        <Button
          variant="ghost"
          onClick={handleRewind}
          disabled={state !== "playing" && state !== "paused"}
        >
          <RotateCcw size={18} aria-hidden="true" />
          Lùi 5 giây
        </Button>
        <Button variant="ghost" aria-pressed={isSlow} onClick={handleSpeed}>
          Chậm 0.75x
        </Button>
      </div>
      <p className="listen-count small muted" data-testid="listen-count">
        Đã nghe {listenCount} lần{maxListens !== null ? ` / tối đa ${maxListens}` : ""}
      </p>
      <p className={state === "error" ? "small error-text" : "small muted"} role="status">
        {isLimitReached && state === "idle" ? "Đã hết số lần nghe cho câu này." : STATE_TEXT[state]}
      </p>
    </div>
  );
}
