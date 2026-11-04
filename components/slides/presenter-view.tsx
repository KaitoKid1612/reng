"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { LessonSlide, listSlideIds } from "@/components/slides/lesson-slide";
import { Button } from "@/components/ui/button";
import { signInPath } from "@/lib/auth-paths";
import { slidePresenterPath } from "@/lib/class-sessions";
import { slideChannelName, slideMessageSchema } from "@/lib/slide-navigation";

import type { PublicAnyLesson } from "@/lib/teaching-content";

interface PresenterViewProps {
  lesson: PublicAnyLesson;
  /** Kept on the link back to the slides, so their "Ghi buổi dạy" button stays. */
  classId?: string;
}

// Keys a presentation clicker or a keyboard sends for the next and previous slide.
const NEXT_KEYS = new Set(["ArrowRight", "ArrowDown", "PageDown"]);
const PREVIOUS_KEYS = new Set(["ArrowLeft", "ArrowUp", "PageUp"]);

export function PresenterView({ lesson, classId }: PresenterViewProps) {
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [notesMessage, setNotesMessage] = useState(
    "Đăng nhập tài khoản giáo viên để xem ghi chú riêng.",
  );
  const [hasNotes, setHasNotes] = useState(false);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt) / 1000)),
      1000,
    );
    if (!("BroadcastChannel" in window)) {
      return () => window.clearInterval(timer);
    }
    const channel = new BroadcastChannel(slideChannelName(lesson.lessonId, lesson.id));
    channel.onmessage = (event: MessageEvent<unknown>) => {
      const parsed = slideMessageSchema.safeParse(event.data);
      if (
        parsed.success &&
        parsed.data.type === "position" &&
        parsed.data.index < listSlideIds(lesson).length
      ) {
        setIndex(parsed.data.index);
        setIsConnected(true);
      }
    };
    channel.postMessage({ type: "request" });
    const heartbeat = window.setInterval(() => channel.postMessage({ type: "request" }), 1500);
    return () => {
      window.clearInterval(timer);
      window.clearInterval(heartbeat);
      channel.close();
    };
  }, [lesson]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/lessons/${lesson.lessonId}/notes?version=${lesson.id}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          return;
        }
        const result: unknown = await response.json();
        if (
          result &&
          typeof result === "object" &&
          "notes" in result &&
          result.notes &&
          typeof result.notes === "object"
        ) {
          const entries = Object.entries(result.notes).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
          );
          setNotes(Object.fromEntries(entries));
          setNotesMessage("Không có ghi chú cho slide này.");
          setHasNotes(true);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [lesson]);

  // The presenter window has focus while the teacher looks at it, so it turns the slides too.
  useEffect(() => {
    if (!("BroadcastChannel" in window)) {
      return;
    }
    const channel = new BroadcastChannel(slideChannelName(lesson.lessonId, lesson.id));
    function handleKey(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }
      // Space on a focused button or link already presses it.
      const isOnControl =
        event.target instanceof HTMLElement &&
        event.target.closest("button, a, input, textarea, select") !== null;
      let command: "prev" | "next" | null = null;
      if (NEXT_KEYS.has(event.key) || (event.key === " " && !isOnControl)) {
        command = "next";
      } else if (PREVIOUS_KEYS.has(event.key)) {
        command = "prev";
      }
      if (command) {
        event.preventDefault();
        channel.postMessage({ type: "command", command });
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      channel.close();
    };
  }, [lesson]);

  function handleCommand(command: "prev" | "next") {
    if (!("BroadcastChannel" in window)) {
      return;
    }
    const channel = new BroadcastChannel(slideChannelName(lesson.lessonId, lesson.id));
    channel.postMessage({ type: "command", command });
    channel.close();
  }

  const slideIds = listSlideIds(lesson);
  const currentId = slideIds[index];
  const hasNext = index + 1 < slideIds.length;
  return (
    <div className="presenter-view">
      <div className="page-heading">
        <div>
          <h1>Presenter: {lesson.title}</h1>
          <p role="status">
            {isConnected
              ? `Đang chiếu slide ${index + 1}`
              : "Đang chờ cửa sổ trình chiếu cùng bài học."}
          </p>
        </div>
        <p className="presenter-clock">
          {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
        </p>
      </div>
      <div className="button-row">
        <Button onClick={() => handleCommand("prev")}>Trước</Button>
        <Button onClick={() => handleCommand("next")}>Tiếp</Button>
        <Link
          href={slidePresenterPath(lesson.lessonId, lesson.id, index + 1, classId)}
          target="reng-slides"
        >
          Mở trình chiếu
        </Link>
      </div>
      <div className="presenter-previews">
        <section>
          <h2>Hiện tại</h2>
          <div className="presenter-preview">
            <LessonSlide lesson={lesson} index={index} staticMode />
          </div>
        </section>
        <section>
          <h2>Tiếp theo</h2>
          <div className="presenter-preview">
            {hasNext ? (
              <LessonSlide lesson={lesson} index={index + 1} staticMode />
            ) : (
              <p>Đã đến cuối bài.</p>
            )}
          </div>
        </section>
      </div>
      <section className="presenter-notes">
        <h2>Ghi chú giáo viên</h2>
        <p>{currentId && notes[currentId] ? notes[currentId] : notesMessage}</p>
        {!hasNotes && (
          <Link href={signInPath(`/lessons/${lesson.lessonId}/presenter?version=${lesson.id}`)}>
            Đăng nhập giáo viên
          </Link>
        )}
      </section>
    </div>
  );
}
