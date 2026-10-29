"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { LessonSlide, listSlideIds } from "@/components/slides/lesson-slide";
import { Button } from "@/components/ui/button";
import { signInPath } from "@/lib/auth-paths";
import { slideChannelName, slideMessageSchema } from "@/lib/slide-navigation";

import type { PublicAnyLesson } from "@/lib/teaching-content";

interface PresenterViewProps {
  lesson: PublicAnyLesson;
}

export function PresenterView({ lesson }: PresenterViewProps) {
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [notesMessage, setNotesMessage] = useState(
    "Đăng nhập tài khoản giảng viên để xem ghi chú riêng.",
  );

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
        }
      })
      .catch(() => {});
    return () => controller.abort();
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
          href={`/lessons/${lesson.lessonId}/slide?version=${lesson.id}#${index + 1}`}
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
        <h2>Ghi chú giảng viên</h2>
        <p>{currentId && notes[currentId] ? notes[currentId] : notesMessage}</p>
        <Link href={signInPath(`/lessons/${lesson.lessonId}/presenter?version=${lesson.id}`)}>
          Đăng nhập giảng viên
        </Link>
      </section>
    </div>
  );
}
