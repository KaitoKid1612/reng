"use client";

import { useActionState, useRef, useState } from "react";

import { classScheduleAction } from "@/app/actions/classes";
import { ActionFeedback } from "@/components/teach/action-feedback";
import { Button } from "@/components/ui/button";
import {
  describeSlot,
  MAX_SCHEDULE_NOTE,
  MAX_SCHEDULE_SLOTS,
  SESSION_LENGTHS,
  WEEKDAY_LABELS,
} from "@/lib/class-schedule";

import type { ClassSchedule, ScheduleSlot } from "@/lib/class-schedule";

interface ClassScheduleFormProps {
  classId: string;
  schedule: ClassSchedule;
}

interface SlotRow {
  id: number;
  slot: ScheduleSlot;
}

const NEW_SLOT: ScheduleSlot = { weekday: 2, start: "19:30", minutes: 90 };

export function ClassScheduleForm({ classId, schedule }: ClassScheduleFormProps) {
  const [state, action, isPending] = useActionState(classScheduleAction, {});
  const nextId = useRef(schedule.slots.length);
  const [rows, setRows] = useState<SlotRow[]>(() =>
    schedule.slots.map((slot, index) => ({ id: index, slot })),
  );

  function updateSlot(id: number, change: Partial<ScheduleSlot>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, slot: { ...row.slot, ...change } } : row)),
    );
  }

  function handleAdd() {
    const id = nextId.current;
    nextId.current += 1;
    setRows((current) => [...current, { id, slot: NEW_SLOT }]);
  }

  return (
    <form action={action} className="form-card">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="slots" value={JSON.stringify(rows.map((row) => row.slot))} />
      {rows.length ? (
        <ol className="schedule-slots">
          {rows.map(({ id, slot }) => (
            <li key={id}>
              <div className="field">
                <label htmlFor={`slot-${id}-day`}>Thứ</label>
                <select
                  id={`slot-${id}-day`}
                  value={slot.weekday}
                  onChange={(event) => updateSlot(id, { weekday: Number(event.target.value) })}
                >
                  {Object.entries(WEEKDAY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor={`slot-${id}-start`}>Bắt đầu</label>
                <input
                  id={`slot-${id}-start`}
                  type="time"
                  required
                  value={slot.start}
                  onChange={(event) => updateSlot(id, { start: event.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor={`slot-${id}-minutes`}>Thời lượng</label>
                <select
                  id={`slot-${id}-minutes`}
                  value={slot.minutes}
                  onChange={(event) => updateSlot(id, { minutes: Number(event.target.value) })}
                >
                  {SESSION_LENGTHS.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes} phút
                    </option>
                  ))}
                </select>
              </div>
              <Button
                variant="ghost"
                aria-label={`Xóa buổi ${describeSlot(slot)}`}
                onClick={() => setRows((current) => current.filter((row) => row.id !== id))}
              >
                Xóa
              </Button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="small muted">
          Chưa có lịch. Thêm các buổi học trong tuần để học viên thấy buổi tới ở trang lớp.
        </p>
      )}
      {rows.length < MAX_SCHEDULE_SLOTS && (
        <div className="schedule-add">
          <Button variant="outline" onClick={handleAdd}>
            Thêm buổi trong tuần
          </Button>
        </div>
      )}
      <div className="field">
        <label htmlFor="schedule-note">Ghi chú cho học viên (tùy chọn)</label>
        <input
          id="schedule-note"
          name="note"
          maxLength={MAX_SCHEDULE_NOTE}
          defaultValue={schedule.note}
          placeholder="Ví dụ: Nghỉ ngày 20/11, học bù tối thứ Bảy."
        />
      </div>
      <ActionFeedback state={state} />
      <Button type="submit" disabled={isPending}>
        {isPending ? "Đang lưu…" : "Lưu lịch học"}
      </Button>
    </form>
  );
}
