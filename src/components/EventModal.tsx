import React, { useEffect, useState, useRef, useCallback } from 'react';
import { RoutineEvent } from '../types/routine';
import { formatTo12Hour } from '../utils/timeCalculations';
import { parseAlternatingSchedule } from '../utils/alternatingLabEngine';
import { useBottomSheetDrag } from '../hooks/useBottomSheetDrag';

interface EventModalProps {
  event: RoutineEvent | null;
  onClose: () => void;
  theme?: 'light' | 'dark';
}

export const EventModal: React.FC<EventModalProps> = ({ event, onClose, theme = 'light' }) => {
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
    // Immediately restore page scroll so dismissal never locks scrolling
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
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleRequestClose]);

  const { backdropStyle, sheetStyle, dragHandleProps } = useBottomSheetDrag({
    isVisible,
    onDismiss: handleRequestClose,
  });

  if (!event) return null;

  const alternating = parseAlternatingSchedule(event.type, event.subject, event.syllabus);
  const isTermFinal = (event.type || '').trim().toLowerCase() === 'tf';
  const isExam = alternating.category === 'EXAM' || isTermFinal;
  const isLab = alternating.category === 'LAB';
  const isCancelled = event.status === 'Cancelled';

  // Raw syllabus string retained across all event types
  const rawSyllabus = (event.syllabus || '').trim();
  const syllabusLines = rawSyllabus
    ? rawSyllabus
        .split('\n')
        .map((s) => s.replace(/^[•\-\*▸]\s*/, '').trim())
        .filter((s) => s.length > 0)
    : [];

  // Flat uppercase marks display for top eyebrow line (e.g., "10 MARKS")
  const rawMarks = (event.marks || '').trim();
  const marksEyebrowText = rawMarks
    ? /mark/i.test(rawMarks)
      ? rawMarks
      : `${rawMarks} Marks`
    : '';

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
    >
      <div
        className={`relative w-full max-w-lg rounded-t-[28px] sm:rounded-[28px] p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto border transform-gpu will-change-transform overscroll-y-contain ${
          isDark
            ? 'bg-[#1C1A18] border-stone-800 text-stone-100'
            : 'bg-white border-stone-200 text-stone-900'
        }`}
        style={sheetStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Draggable Handle & Top Header Strip */}
        <div
          {...dragHandleProps}
          style={{ touchAction: 'none' }}
          className="cursor-grab active:cursor-grabbing"
        >
          {/* Subtle Centered Horizontal Drag-Pill Handle (One UI signature element) */}
          <div className="flex justify-center -mt-1 mb-3 pt-1">
            <div
              className={`w-12 h-1.5 rounded-full transition-colors ${
                isDark ? 'bg-stone-700' : 'bg-stone-300'
              }`}
            />
          </div>

          {/* Top Header Strip: Flat Borderless Uppercase Metadata */}
          <div
            className={`flex items-center gap-2 flex-wrap pb-3 mb-3.5 border-b transition-colors ${
              isDark ? 'border-stone-800' : 'border-stone-200'
            }`}
          >
            <span
              className={`text-[11px] font-semibold uppercase tracking-wider ${
                isDark ? 'text-stone-400' : 'text-stone-500'
              }`}
            >
              {isTermFinal ? 'Term Final' : isLab ? 'Lab' : isExam ? 'Exam' : 'Lecture'}
            </span>

            {alternating.groupTag && !isCancelled && (
              <>
                <span className="text-stone-400">·</span>
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wider ${
                    isDark ? 'text-stone-400' : 'text-stone-500'
                  }`}
                >
                  {alternating.groupTag}
                </span>
              </>
            )}

            {isLab && !isCancelled && rawSyllabus.length === 0 && alternating.hasReportDue && (
              <>
                <span className="text-stone-400">·</span>
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wider ${
                    isDark ? 'text-stone-400' : 'text-stone-500'
                  }`}
                >
                  Report Due
                </span>
              </>
            )}

            <span className="text-stone-400">·</span>
            <span
              className={`text-[11px] font-semibold uppercase tracking-wider ${
                isDark ? 'text-stone-400' : 'text-stone-500'
              }`}
            >
              {event.dateLabel || event.day}
            </span>

            {marksEyebrowText && (
              <>
                <span className="text-stone-400">·</span>
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wider tabular-nums ${
                    isDark ? 'text-stone-400' : 'text-stone-500'
                  }`}
                >
                  {marksEyebrowText}
                </span>
              </>
            )}

            {isCancelled && (
              <>
                <span className="text-stone-400">·</span>
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wider ${
                    isDark ? 'text-stone-400' : 'text-stone-500'
                  }`}
                >
                  Canceled
                </span>
              </>
            )}
          </div>
        </div>

        {/* Course Title */}
        <h2
          className={`text-lg sm:text-xl font-bold tracking-tight leading-snug mb-3 ${
            isCancelled
              ? 'line-through text-stone-500'
              : isDark
              ? 'text-stone-100'
              : 'text-stone-900'
          }`}
        >
          {event.subject}
        </h2>

        {/* Borderless Vertical Metadata List with 1px Dividers */}
        <div
          className={`flex flex-col divide-y mb-4 ${
            isDark ? 'divide-stone-800' : 'divide-stone-200'
          }`}
        >
          {/* SYLLABUS (first borderless row above TIME when syllabus exists) */}
          {syllabusLines.length > 0 && (
            <div className="py-3 first:pt-1">
              <div
                className={`text-[11px] font-semibold uppercase tracking-wider ${
                  isDark ? 'text-stone-400' : 'text-stone-500'
                }`}
              >
                Syllabus
              </div>
              <div
                className={`text-sm font-medium mt-1 leading-relaxed space-y-1 ${
                  isDark ? 'text-stone-100' : 'text-stone-900'
                }`}
              >
                {syllabusLines.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          )}

          {/* TIME & ROOM side-by-side 2-column grid */}
          <div className="py-3 first:pt-1 grid grid-cols-2 gap-4">
            <div className="min-w-0">
              <div
                className={`text-[11px] font-semibold uppercase tracking-wider ${
                  isDark ? 'text-stone-400' : 'text-stone-500'
                }`}
              >
                Time
              </div>
              <div
                className={`text-sm font-semibold mt-1 font-sans tabular-nums ${
                  isDark ? 'text-stone-100' : 'text-stone-900'
                }`}
              >
                {formatTo12Hour(event.startTime)} – {formatTo12Hour(event.endTime)}
              </div>
            </div>

            <div className="min-w-0">
              <div
                className={`text-[11px] font-semibold uppercase tracking-wider ${
                  isDark ? 'text-stone-400' : 'text-stone-500'
                }`}
              >
                Room
              </div>
              <div
                className={`text-sm font-semibold mt-1 font-sans ${
                  isDark ? 'text-stone-100' : 'text-stone-900'
                }`}
              >
                {event.room || 'Room TBA'}
              </div>
            </div>
          </div>

          {/* FACULTY (omitted on Term Finals when not provided) */}
          {(!isTermFinal || Boolean((event.teacher || '').trim())) && (
            <div className="py-3">
              <div
                className={`text-[11px] font-semibold uppercase tracking-wider ${
                  isDark ? 'text-stone-400' : 'text-stone-500'
                }`}
              >
                Faculty
              </div>
              <div className={`text-sm font-semibold mt-1 ${isDark ? 'text-stone-100' : 'text-stone-900'}`}>
                {event.teacher || 'Not designated'}
              </div>
            </div>
          )}

          {/* Assigned Lab Group (when Lab) */}
          {alternating.category === 'LAB' && (
            <div className="py-3">
              <div
                className={`text-[11px] font-semibold uppercase tracking-wider ${
                  isDark ? 'text-stone-400' : 'text-stone-500'
                }`}
              >
                Assigned Lab Group
              </div>
              <div
                className={`text-sm font-semibold mt-1 ${
                  isDark ? 'text-stone-100' : 'text-stone-900'
                }`}
              >
                {alternating.groupTag === 'GRP A'
                  ? 'Group A Only (Sessional Attendance)'
                  : alternating.groupTag === 'GRP B'
                  ? 'Group B Only (Sessional Attendance)'
                  : alternating.groupTag === 'GRP A/B'
                  ? 'Dual Group (Group A & Group B Dual Attendance)'
                  : 'Full Batch Laboratory Sessional (Combined Attendance)'}
              </div>
            </div>
          )}
        </div>

        {/* Bottom action: Light secondary/ghost pill button ("Close") */}
        <div className="pt-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRequestClose();
            }}
            className={`w-full py-2.5 px-5 rounded-full cursor-pointer font-medium text-sm leading-tight transition-all duration-150 active:scale-95 border ${
              isDark
                ? 'bg-[#24211E] text-stone-200 hover:bg-stone-800 hover:text-stone-100 border-stone-800'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200 hover:text-stone-900 border-stone-200'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
