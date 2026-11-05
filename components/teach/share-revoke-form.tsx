"use client";

import { useActionState, useState } from "react";

import { revokeShareAction } from "@/app/actions/lesson-sharing";
import { ActionFeedback } from "@/components/teach/action-feedback";
import { Button } from "@/components/ui/button";

interface ShareRevokeFormProps {
  shareId: string;
  recipientLabel: string;
}

// Asked again first, like removing a learner: the colleague loses the version at once.
export function ShareRevokeForm({ shareId, recipientLabel }: ShareRevokeFormProps) {
  const [state, action, isPending] = useActionState(revokeShareAction, {});
  const [isConfirming, setIsConfirming] = useState(false);
  if (!isConfirming) {
    return (
      <div>
        <Button
          variant="outline"
          aria-label={`Thu hồi quyền của ${recipientLabel}`}
          onClick={() => setIsConfirming(true)}
        >
          Thu hồi
        </Button>
        <ActionFeedback state={state} />
      </div>
    );
  }
  return (
    <form action={action} className="inline-form">
      <input type="hidden" name="shareId" value={shareId} />
      <p className="small">
        {recipientLabel} sẽ không mở được phiên bản này nữa. Bản sao họ đã tạo vẫn là của họ. Muốn
        cho xem lại thì chia sẻ lần nữa.
      </p>
      <div className="button-row">
        <Button
          type="submit"
          disabled={isPending}
          aria-label={`Xác nhận thu hồi quyền của ${recipientLabel}`}
        >
          Xác nhận thu hồi
        </Button>
        <Button variant="ghost" onClick={() => setIsConfirming(false)}>
          Giữ quyền
        </Button>
      </div>
      <ActionFeedback state={state} />
    </form>
  );
}
