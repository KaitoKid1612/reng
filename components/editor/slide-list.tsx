"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { useId } from "react";

import { SLIDE_TYPE_LABELS, summarizeSlide } from "@/components/editor/slide-labels";
import { Button } from "@/components/ui/button";

import type { Announcements, DragEndEvent, UniqueIdentifier } from "@dnd-kit/core";
import type { DraftContent, DraftSlide } from "@/lib/lesson-draft";

interface SlideListProps {
  content: DraftContent;
  selectedSlideId: string | null;
  onSelect: (id: string) => void;
  onMove: (from: number, to: number) => void;
}

interface SortableSlideProps {
  slide: DraftSlide;
  index: number;
  total: number;
  summary: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onMove: (from: number, to: number) => void;
}

function SortableSlide({
  slide,
  index,
  total,
  summary,
  isSelected,
  onSelect,
  onMove,
}: SortableSlideProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slide.id,
  });
  return (
    <li
      ref={setNodeRef}
      className="slide-list-item"
      data-selected={isSelected}
      data-dragging={isDragging}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        type="button"
        className="drag-handle"
        aria-label={`Kéo để đổi vị trí slide ${index + 1}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={18} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="slide-list-select"
        aria-pressed={isSelected}
        onClick={() => onSelect(slide.id)}
      >
        <span>
          {index + 1}. {SLIDE_TYPE_LABELS[slide.type]}
        </span>
        <span className="small muted" lang="ja">
          {summary}
        </span>
      </button>
      <Button
        variant="ghost"
        aria-label={`Đưa slide ${index + 1} lên`}
        disabled={index === 0}
        onClick={() => onMove(index, index - 1)}
      >
        <ArrowUp size={16} aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        aria-label={`Đưa slide ${index + 1} xuống`}
        disabled={index === total - 1}
        onClick={() => onMove(index, index + 1)}
      >
        <ArrowDown size={16} aria-hidden="true" />
      </Button>
    </li>
  );
}

export function SlideList({ content, selectedSlideId, onSelect, onMove }: SlideListProps) {
  // A stable ID keeps dnd-kit's screen-reader descriptions identical on server and client.
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = content.slides.map((slide) => slide.id);
  const position = (id: UniqueIdentifier) => ids.indexOf(String(id)) + 1;
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Đã nhấc slide ${position(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `Slide ${position(active.id)} đang ở vị trí ${position(over.id)}.`
        : `Slide ${position(active.id)} đang ở ngoài danh sách.`,
    onDragEnd: ({ over }) =>
      over ? `Đã thả slide vào vị trí ${position(over.id)}.` : "Đã thả slide.",
    onDragCancel: () => "Đã hủy di chuyển slide.",
  };

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) {
      return;
    }
    onMove(position(event.active.id) - 1, position(event.over.id) - 1);
  }

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            "Nhấn Space để nhấc slide, mũi tên lên/xuống để di chuyển, Space để thả, Esc để hủy.",
        },
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ol className="slide-list">
          {content.slides.map((slide, index) => (
            <SortableSlide
              key={slide.id}
              slide={slide}
              index={index}
              total={content.slides.length}
              summary={summarizeSlide(slide, content)}
              isSelected={slide.id === selectedSlideId}
              onSelect={onSelect}
              onMove={onMove}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}
