"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { SlideContent } from "@/components/slides/slide-content";
import { Button } from "@/components/ui/button";
import { parseSlideHash, slideChannelName, slideMessageSchema } from "@/lib/slide-navigation";

import type { RevealApi } from "reveal.js";
import type { PublicLesson } from "@/lib/lesson-schema";

interface SlideDeckProps {
  lesson: PublicLesson;
  printMode: boolean;
}

export function SlideDeck({ lesson, printMode }: SlideDeckProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<RevealApi | null>(null);
  const [position, setPosition] = useState(0);
  const [notice, setNotice] = useState("");
  const [isReady, setIsReady] = useState(false);
  const base = `/lessons/${lesson.lessonId}`;

  useEffect(() => {
    if (printMode || !rootRef.current) {
      return;
    }
    const root = rootRef.current;
    let cancelled = false;
    let deck: RevealApi | null = null;
    let channel: BroadcastChannel | null = null;

    function publishPosition() {
      if (!deck || cancelled) {
        return;
      }
      const { h, f } = deck.getIndices();
      setPosition(h);
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}#${h + 1}`,
      );
      channel?.postMessage({ type: "position", index: h, fragment: f ?? -1 });
    }

    function handleHashChange() {
      const result = parseSlideHash(window.location.hash, lesson.content.slides.length);
      if (!result.isValid) {
        setNotice("Vị trí slide không hợp lệ. Đã mở slide đầu.");
      }
      deck?.slide(result.index, 0, -1);
      publishPosition();
    }

    void import("reveal.js")
      .then(async ({ default: Reveal }) => {
        if (cancelled) {
          return;
        }
        deck = new Reveal(root, {
          width: 1280,
          height: 720,
          margin: 0.04,
          embedded: true,
          hash: false,
          respondToHashChanges: false,
          controls: false,
          progress: true,
          transition: "none",
          center: true,
          touch: true,
        });
        await deck.initialize();
        await document.fonts.ready;
        if (cancelled) {
          deck.destroy();
          return;
        }
        deckRef.current = deck;
        deck.addKeyBinding({ keyCode: 83, key: "S", description: "Open presenter" }, () => {
          const popup = window.open(
            `/lessons/${lesson.lessonId}/presenter?version=${lesson.id}`,
            "masu-presenter",
            "width=1200,height=850",
          );
          if (!popup) {
            setNotice("Cửa sổ bị chặn. Dùng liên kết Mở presenter bên dưới.");
          }
        });
        deck.on("slidechanged", publishPosition);
        deck.on("fragmentshown", publishPosition);
        deck.on("fragmenthidden", publishPosition);
        if ("BroadcastChannel" in window) {
          channel = new BroadcastChannel(slideChannelName(lesson.lessonId, lesson.id));
          channel.onmessage = (event: MessageEvent<unknown>) => {
            const parsed = slideMessageSchema.safeParse(event.data);
            if (!parsed.success || !deck) {
              return;
            }
            if (parsed.data.type === "request") {
              publishPosition();
            }
            if (parsed.data.type === "command") {
              deck[parsed.data.command]();
            }
          };
        }
        handleHashChange();
        window.addEventListener("hashchange", handleHashChange);
        setIsReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setNotice("Chưa khởi động được trình chiếu. Tải lại trang để thử nhé.");
        }
      });

    return () => {
      cancelled = true;
      window.removeEventListener("hashchange", handleHashChange);
      channel?.close();
      if (deck?.isReady()) {
        deck.destroy();
      }
      deckRef.current = null;
    };
  }, [lesson, printMode]);

  function handlePresenter() {
    deckRef.current?.triggerKey(83);
  }

  async function handleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await rootRef.current?.parentElement?.requestFullscreen();
      }
    } catch {
      setNotice("Thiết bị chưa cho phép toàn màn hình. Bạn vẫn có thể tiếp tục trình chiếu.");
    }
  }

  if (printMode) {
    return (
      <div className="lesson-print">
        <div className="print-toolbar">
          <Button onClick={() => window.print()}>In / Lưu PDF</Button>
          <Link href={`${base}/slide?version=${lesson.id}#1`}>Quay lại trình chiếu</Link>
        </div>
        {lesson.content.slides.map((slide, index) => (
          <section key={slide.id} className="print-slide">
            <SlideContent slide={slide} lesson={lesson} staticMode />
            <span className="print-page-number">
              {index + 1} / {lesson.content.slides.length}
            </span>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="slide-shell">
      <div className="slide-toolbar">
        <Link href={`${base}?version=${lesson.id}`}>Đọc bài</Link>
        <div className="button-row">
          <Button variant="ghost" onClick={() => deckRef.current?.prev()} disabled={!isReady}>
            Trước
          </Button>
          <span data-testid="slide-counter">
            {position + 1} / {lesson.content.slides.length}
          </span>
          <Button variant="ghost" onClick={() => deckRef.current?.next()} disabled={!isReady}>
            Tiếp
          </Button>
        </div>
        <div className="button-row">
          <Button variant="ghost" onClick={handleFullscreen}>
            Toàn màn hình
          </Button>
          <Button variant="ghost" onClick={handlePresenter}>
            Presenter
          </Button>
          <Link href={`${base}/slide?version=${lesson.id}&print-pdf`}>PDF</Link>
        </div>
      </div>
      <div className="slide-stage">
        <div className="reveal" ref={rootRef} data-ready={isReady}>
          <div className="slides">
            {lesson.content.slides.map((slide) => (
              <section key={slide.id} className="slide-page">
                <SlideContent slide={slide} lesson={lesson} />
              </section>
            ))}
          </div>
        </div>
      </div>
      {notice && (
        <p role="status" className="slide-notice">
          {notice}{" "}
          <a href={`${base}/presenter?version=${lesson.id}`} target="masu-presenter">
            Mở presenter
          </a>
        </p>
      )}
    </div>
  );
}
