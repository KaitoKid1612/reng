"use client";

import { useActionState } from "react";

import { changePassword, deleteOwnAccount, updateAccountName } from "@/app/actions/auth";
import { FormFeedback } from "@/components/auth/form-feedback";
import { Button } from "@/components/ui/button";
import { ACCOUNT_DELETION_WORD } from "@/lib/account-deletion";

interface AccountNameFormProps {
  fullName: string;
}

export function AccountNameForm({ fullName }: AccountNameFormProps) {
  const [state, action, isPending] = useActionState(updateAccountName, {});
  return (
    <form action={action} className="form-card" aria-labelledby="account-name-title">
      <h2 id="account-name-title">Họ tên</h2>
      <p className="small muted">Giáo viên thấy tên này trong lớp; học viên thấy tên giáo viên.</p>
      <div className="field">
        <label htmlFor="account-name">Họ tên hiển thị</label>
        <input
          id="account-name"
          name="fullName"
          autoComplete="name"
          required
          maxLength={80}
          defaultValue={fullName}
        />
      </div>
      <FormFeedback state={state} />
      <Button type="submit" disabled={isPending}>
        {isPending ? "Đang lưu…" : "Lưu họ tên"}
      </Button>
    </form>
  );
}

export function PasswordChangeForm() {
  const [state, action, isPending] = useActionState(changePassword, {});
  return (
    <form action={action} className="form-card" aria-labelledby="account-password-title">
      <h2 id="account-password-title">Mật khẩu</h2>
      <p className="small muted">
        Đặt mật khẩu mới để đăng nhập bằng email. Các thiết bị khác đang đăng nhập sẽ phải đăng nhập
        lại.
      </p>
      <div className="field">
        <label htmlFor="new-password">Mật khẩu mới</label>
        <input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          aria-describedby="new-password-hint"
        />
        <p id="new-password-hint" className="small muted">
          Ít nhất 8 ký tự.
        </p>
      </div>
      <div className="field">
        <label htmlFor="confirm-new-password">Nhập lại mật khẩu mới</label>
        <input
          id="confirm-new-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
        />
      </div>
      <FormFeedback state={state} />
      <Button type="submit" disabled={isPending}>
        {isPending ? "Đang lưu…" : "Lưu mật khẩu"}
      </Button>
    </form>
  );
}

// Deleting is final, so the form spells out what goes and what stays, and asks for a typed word.
export function DeleteAccountForm() {
  const [state, action, isPending] = useActionState(deleteOwnAccount, {});
  return (
    <form action={action} className="form-card danger-zone" aria-labelledby="delete-account-title">
      <h2 id="delete-account-title">Xóa tài khoản</h2>
      <ul className="small">
        <li>Xóa họ tên, email và cách đăng nhập; bạn rời mọi lớp và không nhận nhắc học nữa.</li>
        <li>
          Bài đã nộp, điểm và lịch sử ôn vẫn ở lại trong thống kê của lớp dưới tên “Học viên đã
          xóa”; không ai liên kết được chúng với bạn.
        </li>
        <li>Không khôi phục được. Muốn học tiếp, bạn đăng ký lại và vào lớp bằng mã mới.</li>
      </ul>
      <div className="field">
        <label htmlFor="delete-account-confirm">Gõ {ACCOUNT_DELETION_WORD} để xác nhận</label>
        <input
          id="delete-account-confirm"
          name="confirm"
          required
          autoComplete="off"
          maxLength={20}
        />
      </div>
      <FormFeedback state={state} />
      <Button type="submit" className="button-danger" disabled={isPending}>
        {isPending ? "Đang xóa…" : "Xóa tài khoản vĩnh viễn"}
      </Button>
    </form>
  );
}
