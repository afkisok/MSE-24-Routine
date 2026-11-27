import React, { useEffect, useState, useRef, useCallback } from 'react';
import { RoutineAssignment } from '../types/routine';
import { useBottomSheetDrag } from '../hooks/useBottomSheetDrag';

interface AssignmentsModalProps {
  assignments: RoutineAssignment[];
  onClose: () => void;
  theme?: 'light' | 'dark';
}

export const AssignmentsModal: React.FC<AssignmentsModalProps> = ({
  assignments,
  onClose,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const isClosingRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);
  const originalScrollRef = useRef<{ overflow: string; touchAction: string } | null>(null);
  const hasUnlockedRef = useRef(false);

  const unlockScroll = useCallback(() => {
    if (hasUnlockedRef.current || !originalScrollRef.current) return;
    hasUnlockedRef.current = true;
    document.body.style.overflow = originalScrollRef.current.overflow;
    document.body.style.touchAction = originalScrollRef.current.touchAction;
  }, []);

  // Trigger smooth ease-out slide-up + backdrop fade-in on mount
  useEffect(() => {
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setIsVisible(true);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, []);

  // Robust scroll lock cleanup with immediate unlock on close AND guaranteed unmount restore
  useEffect(() => {
    originalScrollRef.current = {
      overflow: document.body.style.overflow,
      touchAction: document.body.style.touchAction,
    };
    hasUnlockedRef.current = false;

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      unlockScroll();
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, [unlockScroll]);

  const handleRequestClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsClosing(true);
    setIsVisible(false);
    unlockScroll();

    closeTimerRef.current = window.setTimeout(() => {
      onClose();
    }, 200);
  }, [onClose, unlockScroll]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleRequestClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRequestClose]);

  const { backdropStyle, sheetStyle, dragHandleProps } = useBottomSheetDrag({
    isVisible,
    onDismiss: handleRequestClose,
  });

  const cleanValue = (val?: string) => {
    const trimmed = (val || '').trim();
    if (!trimmed || trimmed === '-' || trimmed.toLowerCase() === 'n/a') return '';
    return trimmed;
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none overscroll-y-contain transition-opacity duration-200 ease-out ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } ${isClosing ? 'pointer-events-none' : ''}`}
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        ...backdropStyle,
      }}
      onClick={(e) => {
        e.stopPropagation();
        handleRequestClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Active Assignments"
    >
      <div
        className={`relative w-full max-w-lg rounded-t-[28px] sm:rounded-[28px] p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border transform-gpu will-change-transform overscroll-y-contain ${
          isDark
            ? 'bg-[#1C1A18] border-stone-800 text-stone-100'
            : 'bg-white border-stone-200 text-stone-900'
        }`}
        style={sheetStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Draggable Handle + Top Eyebrow Header */}
        <div
          {...dragHandleProps}
          style={{ touchAction: 'none' }}
          className="cursor-grab active:cursor-grabbing shrink-0"
        >
          {/* Centered Horizontal Drag Handle */}
          <div className="flex justify-center -mt-1 mb-3 pt-1">
            <div
              className={`w-12 h-1.5 rounded-full transition-colors ${
                isDark ? 'bg-stone-700' : 'bg-stone-300'
              }`}
            />
          </div>

          {/* Flat Uppercase Eyebrow */}
          <div
            className={`flex items-center justify-between pb-3 mb-2 border-b transition-colors ${
              isDark ? 'border-stone-800' : 'border-stone-200'
            }`}
          >
            <span
              className={`text-[11px] font-semibold uppercase tracking-wider ${
                isDark ? 'text-[#FAF9F6]' : 'text-[#141312]'
              }`}
            >
              Assignments
            </span>
          </div>
        </div>

        {/* Scrollable Assignments List */}
        <div className="overflow-y-auto overscroll-y-contain mb-4 pr-0.5">
          {assignments.length === 0 ? (
            <div
              className={`py-10 text-center text-sm font-sans ${
                isDark ? 'text-stone-400' : 'text-stone-500'
              }`}
            >
              No active assignments
            </div>
          ) : (
            <div
              className={`flex flex-col divide-y ${
                isDark ? 'divide-stone-800' : 'divide-stone-200'
              }`}
            >
              {assignments.map((item) => {
                const syllabusLines = (item.syllabus || '')
                  .trim()
                  .split('\n')
                  .map((s) => s.replace(/^[•\-\*▸]\s*/, '').trim())
                  .filter((s) => s.length > 0);

                const teacher = cleanValue(item.teacher);
                const dueParts = Array.from(
                  new Set([cleanValue(item.room), cleanValue(item.endTime)].filter(Boolean))
                );
                const metaParts = [teacher, ...dueParts].filter(Boolean);

                return (
                  <div key={item.id} className="py-3.5 first:pt-2 last:pb-2">
                    <h3
                      className={`text-sm sm:text-base font-bold tracking-tight leading-snug ${
                        isDark ? 'text-stone-100' : 'text-stone-900'
                      }`}
                    >
                      {item.subject}
                    </h3>

                    {syllabusLines.length > 0 && (
                      <div
                        className={`mt-1.5 text-sm font-normal leading-relaxed space-y-1 ${
                          isDark ? 'text-stone-300' : 'text-stone-700'
                        }`}
                      >
                        {syllabusLines.map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                      </div>
                    )}

                    {metaParts.length > 0 && (
                      <div
                        className={`mt-2 text-xs font-sans tabular-nums flex items-center gap-1.5 flex-wrap ${
                          isDark ? 'text-stone-400' : 'text-stone-500'
                        }`}
                      >
                        {metaParts.map((part, idx) => (
                          <React.Fragment key={`${item.id}-meta-${idx}`}>
                            {idx > 0 && <span className="text-stone-400">·</span>}
                            <span>{part}</span>
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom action: Full-width pill button ("Close") */}
        <div className="pt-1 shrink-0 pb-[env(safe-area-inset-bottom)] sm:pb-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRequestClose();
            }}
            className={`w-full py-2.5 px-5 rounded-full cursor-pointer font-medium text-sm leading-tight transition-all duration-150 active:scale-95 shadow-sm border ${
              isDark
                ? 'bg-stone-100 text-stone-900 hover:bg-stone-200 border-stone-100'
                : 'bg-stone-900 text-stone-50 hover:bg-stone-800 border-stone-900'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
