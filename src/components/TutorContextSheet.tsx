import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface TutorContextSheetProps {
  open: boolean;
  title: string;
  language: 'en' | 'it';
  onClose: () => void;
  children: React.ReactNode;
}

const SWIPE_CLOSE_PX = 72;

export function TutorContextSheet({
  open,
  title,
  language,
  onClose,
  children,
}: TutorContextSheetProps) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef(0);
  const dragYRef = useRef(0);
  const draggingRef = useRef(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setDragY(0);
      setDragging(false);
    }
  }, [open]);

  const onTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    draggingRef.current = true;
    setDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!draggingRef.current) return;
    const dy = e.touches[0].clientY - startYRef.current;
    if (dy > 0) {
      dragYRef.current = dy;
      setDragY(dy);
    }
  };

  const finishDrag = () => {
    if (dragYRef.current >= SWIPE_CLOSE_PX) {
      onClose();
    }
    draggingRef.current = false;
    dragYRef.current = 0;
    setDragging(false);
    setDragY(0);
  };

  if (!open) return null;

  return (
    <div className="tutor-sheet-backdrop" onClick={onClose} role="presentation">
      <div
        ref={sheetRef}
        className={`tutor-sheet ${dragging ? 'tutor-sheet--dragging' : ''}`}
        style={dragY > 0 ? { transform: `translateY(${dragY}px)` } : undefined}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div
          className="tutor-sheet-drag-zone"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={finishDrag}
          onTouchCancel={finishDrag}
        >
          <span className="tutor-sheet-handle" aria-hidden="true" />
        </div>
        <header className="tutor-sheet-header">
          <h3>{title}</h3>
          <button
            type="button"
            className="tutor-sheet-close"
            onClick={onClose}
            aria-label={language === 'en' ? 'Close' : 'Chiudi'}
          >
            <X size={20} />
          </button>
        </header>
        <div className="tutor-sheet-body">{children}</div>
      </div>
    </div>
  );
}
