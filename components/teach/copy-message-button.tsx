"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

interface CopyMessageButtonProps {
  message: string;
  /** A text-style button for lists, where a full button per row would crowd the page. */
  isCompact?: boolean;
}

export function CopyMessageButton({ message, isCompact = false }: CopyMessageButtonProps) {
  const [notice, setNotice] = useState("");
  const [isShowingText, setIsShowingText] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message);
      setNotice("Đã sao chép. Dán vào nhóm Zalo hoặc Messenger của lớp.");
      setIsShowingText(false);
    } catch {
      // Clipboard access can be blocked; the message is shown so it can be copied by hand.
      setNotice("Trình duyệt chưa cho sao chép tự động. Chọn đoạn tin nhắn bên dưới rồi sao chép.");
      setIsShowingText(true);
    }
  }

  return (
    <div className="copy-message">
      {isCompact ? (
        <button type="button" className="link-button copy-message-link" onClick={handleCopy}>
          Sao chép tin nhắn giao bài
        </button>
      ) : (
        <Button variant="outline" onClick={handleCopy}>
          Sao chép tin nhắn cho nhóm lớp
        </Button>
      )}
      {notice && (
        <p className="small muted" role="status">
          {notice}
        </p>
      )}
      {isShowingText && (
        <textarea
          className="copy-message-text"
          aria-label="Tin nhắn giao bài"
          readOnly
          rows={3}
          value={message}
        />
      )}
    </div>
  );
}
