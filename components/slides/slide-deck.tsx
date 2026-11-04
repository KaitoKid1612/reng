"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { LessonSlide, listSlideIds } from "@/components/slides/lesson-slide";
import { Button } from "@/components/ui/button";
import { sessionLogPath, slidePresenterPath } from "@/lib/class-sessions";
import { parseSlideHash, slideChannelName, slideMessageSchema } from "@/lib/slide-navigation";

import type { RevealApi } from "reveal.js";
import type { PublicAnyLesson } from "@/lib/teaching-content";

const SLIDE_HEIGHT = 720;
// Below this the text gets hard to read; content that still does not fit scrolls off as before.
const MIN_FIT_ZOOM = 0.6;
const FIT_SPARE_PIXELS = 4;

// The slide layouts already switch to denser type for long content. Anything still taller than
// the 1280×720 slide (a teacher's very long note, say) is zoomed out here so nothing is cut off in
// class. Sizes are CSS pixels, so the deck's own scaling of the stage does not affect them.
function fitSlide(section: Element | undefined) {
  if (!(section instanceof HTMLElement)) {
    return;
  }
  const content = section.firstElementChild;
  if (!(content instanceof HTMLElement)) {
    return;
  }
  content.style.removeProperty("zoom");
  if (section.scrollHeight <= SLIDE_HEIGHT || !content.offsetHeight) {
    return;
  }
  const available = SLIDE_HEIGHT - (section.scrollHeight - content.offsetHeight);
  // Zoomed line boxes round their heights, so a few pixels are kept spare.
  const zoom = Math.max(
    MIN_FIT_ZOOM,
    Math.floor(((available - FIT_SPARE_PIXELS) / content.offsetHeight) * 1000) / 1000,
  );
  content.style.setProperty("zoom", String(zoom));
}

interface SlideDeckProps {
  lesson: PublicAnyLesson;
  printMode: boolean;
  // Set when the teacher opened the slides from a class page.
  classId?: string;
  /** Teachers get the Presenter button; learners reading slides have no notes to open. */
  canPresent?: boolean;
}

export function SlideDeck({ lesson, printMode, classId, canPresent = false }: SlideDeckProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<RevealApi | null>(null);
  const [position, setPosition] = useState(0);
  const [notice, setNotice] = useState("");
  const [isReady, setIsReady] = useState(false);
  const base = `/lessons/${lesson.lessonId}`;
  // The presenter keeps the class so its link back to the slides keeps "Ghi buổi dạy".
  const classQuery = classId ? `&class=${classId}` : "";
  const slideIds = listSlideIds(lesson);

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
      const result = parseSlideHash(window.location.hash, listSlideIds(lesson).length);
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
          // reveal.js 6 turns narrow screens into a scrolling page; that view loops with the
          // slide fitting below and leaves the counter and Trước/Tiếp without a current slide.
          scrollActivationWidth: 0,
        });
        await deck.initialize();
        await document.fonts.ready;
        if (cancelled) {
          deck.destroy();
          return;
        }
        deckRef.current = deck;
        const fitCurrentSlide = () => {
          if (!deck) {
            return;
          }
          fitSlide(deck.getCurrentSlide());
          deck.layout();
        };
        deck.on("slidechanged", fitCurrentSlide);
        deck.addKeyBinding({ keyCode: 83, key: "S", description: "Open presenter" }, () => {
          const popup = window.open(
            `/lessons/${lesson.lessonId}/presenter?version=${lesson.id}${classQuery}`,
            "reng-presenter",
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
        fitCurrentSlide();
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
  }, [classQuery, lesson, printMode]);

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
          <Link href={slidePresenterPath(lesson.lessonId, lesson.id, 1, classId)}>
            Quay lại trình chiếu
          </Link>
        </div>
        {slideIds.map((id, index) => (
          <section key={id} className="print-slide">
            <LessonSlide lesson={lesson} index={index} staticMode />
            <span className="print-page-number">
              {index + 1} / {slideIds.length}
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
            {position + 1} / {slideIds.length}
          </span>
          <Button variant="ghost" onClick={() => deckRef.current?.next()} disabled={!isReady}>
            Tiếp
          </Button>
        </div>
        <div className="button-row">
          <Button variant="ghost" onClick={handleFullscreen}>
            Toàn màn hình
          </Button>
          {canPresent && (
            <Button variant="ghost" onClick={handlePresenter}>
              Presenter
            </Button>
          )}
          <Link href={`${base}/slide?version=${lesson.id}&print-pdf`}>PDF</Link>
          {/* A new tab: this tab is the one shared in Meet, and the class page shows learners'
              names and scores. */}
          {classId && (
            <a
              href={sessionLogPath(classId, lesson.lessonId, position + 1)}
              target="_blank"
              rel="noopener"
            >
              Ghi buổi dạy (slide {position + 1})
            </a>
          )}
        </div>
      </div>
      <div className="slide-stage">
        <div className="reveal" ref={rootRef} data-ready={isReady}>
          <div className="slides">
            {slideIds.map((id, index) => (
              <section key={id} className="slide-page">
                <LessonSlide lesson={lesson} index={index} />
              </section>
            ))}
          </div>
        </div>
      </div>
      {notice && (
        <p role="status" className="slide-notice">
          {notice}{" "}
          <a href={`${base}/presenter?version=${lesson.id}${classQuery}`} target="reng-presenter">
            Mở presenter
          </a>
        </p>
      )}
    </div>
  );
}
