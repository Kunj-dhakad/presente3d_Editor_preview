"use client";
import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableSlideProps {
  id: string | number;
  children?: ReactNode;
}

export default function SortableSlide({ id, children }: SortableSlideProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? transition : undefined, 
        touchAction: "pan-y",
        willChange: isDragging ? "transform" : "auto",
        contain: "layout style",
      }}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}