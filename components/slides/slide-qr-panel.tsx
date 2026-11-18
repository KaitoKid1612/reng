"use client";

import { useEffect, useMemo, useState } from "react";
import { encode } from "uqr";

import { Button } from "@/components/ui/button";

import type { SlideQrTarget } from "@/lib/slide-qr";

export interface SlideQrLink extends SlideQrTarget {
  url: string;
}

// One path of unit squares: a crisp code at any size, black on white whatever the theme, since
// phone cameras read dark modules on a light ground best. Low error correction keeps the modules
// large: a code on a shared screen is blurred by the video call, never scratched.
function QrCode({ text, label }: { text: string; label: string }) {
  const { size, path } = useMemo(() => {
    const { data, size: modules } = encode(text, { ecc: "L", border: 2 });
    const parts: string[] = [];
    data.forEach((row, y) =>
      row.forEach((isDark, x) => {
        if (isDark) {
          parts.push(`M${x} ${y}h1v1h-1z`);
        }
      }),
    );
    return { size: modules, path: parts.join("") };
  }, [text]);
  return (
    <svg
      className="slide-qr-code"
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <rect width={size} height={size} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}

interface SlideQrPanelProps {
  links: readonly SlideQrLink[];
  onClose: () => void;
}

// Shown over the shared slide, so the class sees it in Meet and scans it from the screen.
export function SlideQrPanel({ links, onClose }: SlideQrPanelProps) {
  const [selectedId, setSelectedId] = useState(links[0]?.id);
  const selected = links.find((link) => link.id === selectedId) ?? links[0];

  useEffect(() => {
    // Captured before reveal.js, which would otherwise open the slide overview on Escape.
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [onClose]);

  if (!selected) {
    return null;
  }
  return (
    <section className="slide-qr" aria-labelledby="slide-qr-title">
      <div className="slide-qr-card">
        <div className="slide-qr-main">
          <QrCode text={selected.url} label={`Mã QR: ${selected.label}`} />
          <div className="slide-qr-text">
            <h2 id="slide-qr-title">Quét mã bằng điện thoại</h2>
            <p className="slide-qr-label">{selected.label}</p>
            <p className="slide-qr-detail">{selected.detail}</p>
            <p className="slide-qr-url">{selected.url.replace(/^https?:\/\//, "")}</p>
          </div>
        </div>
        <div className="slide-qr-actions">
          {links.length > 1 && (
            <div className="slide-qr-choices" role="group" aria-label="Chọn mã">
              {links.map((link) => (
                <Button
                  key={link.id}
                  variant={link.id === selected.id ? "default" : "outline"}
                  aria-pressed={link.id === selected.id}
                  onClick={() => setSelectedId(link.id)}
                >
                  {link.kind === "assignment" ? `Bài tập: ${link.label}` : link.label}
                </Button>
              ))}
            </div>
          )}
          <Button variant="ghost" onClick={onClose}>
            Đóng mã QR
          </Button>
        </div>
      </div>
    </section>
  );
}
