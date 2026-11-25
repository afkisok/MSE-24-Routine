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
  const isExam = alternating.category === 'EXAM';
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
            ? 'bg-[#18181B] border-[#27272A] text-[#F4F4F5]'
            : 'bg-white border-[#E2E8F0] text-[#0F172A]'
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
                isDark ? 'bg-zinc-700' : 'bg-zinc-300'
              }`}
            />
          </div>

          {/* Top Header Strip: Flat Borderless Uppercase Metadata */}
          <div
            className={`flex items-center gap-2 flex-wrap pb-3 mb-3.5 border-b transition-colors ${
              isDark ? 'border-[#27272A]' : 'border-[#E2E8F0]'
            }`}
          >
            <span
              className={`text-[11px] font-semibold uppercase tracking-wider ${
                isLab
                  ? isDark
                    ? 'text-emerald-300'
                    : 'text-[#064E3B]'
                  : isDark
                  ? 'text-[#D4D4D8]'
                  : 'text-[#0F172A]'
              }`}
            >
              {isLab ? 'Lab' : isExam ? 'Exam' : 'Lecture'}
            </span>

            {alternating.groupTag && !isCancelled && (
              <>
                <span className="text-slate-400">·</span>
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wider ${
                    isDark ? 'text-emerald-300' : 'text-[#064E3B]'
                  }`}
                >
                  {alternating.groupTag}
                </span>
              </>
            )}

            {isLab && !isCancelled && rawSyllabus.length === 0 && alternating.hasReportDue && (
              <>
                <span className="text-slate-400">·</span>
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wider ${
                    isDark ? 'text-emerald-300' : 'text-[#064E3B]'
                  }`}
                >
                  Report Due
                </span>
              </>
            )}

            <span className="text-slate-400">·</span>
            <span
              className={`text-[11px] font-semibold uppercase tracking-wider ${
                isDark ? 'text-[#A1A1AA]' : 'text-slate-500'
              }`}
            >
              {event.day}
            </span>

            {marksEyebrowText && (
              <>
                <span className="text-slate-400">·</span>
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wider tabular-nums ${
                    isDark ? 'text-[#A1A1AA]' : 'text-slate-500'
                  }`}
                >
                  {marksEyebrowText}
                </span>
              </>
            )}

            {isCancelled && (
              <>
                <span className="text-slate-400">·</span>
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wider ${
                    isDark ? 'text-rose-300' : 'text-rose-700'
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
              ? 'line-through text-slate-500'
              : isDark
              ? 'text-[#F4F4F5]'
              : 'text-[#0F172A]'
          }`}
        >
          {event.subject}
        </h2>

        {/* Borderless Vertical Metadata List with 1px Dividers */}
        <div
          className={`flex flex-col divide-y mb-4 ${
            isDark ? 'divide-[#27272A]' : 'divide-[#E2E8F0]'
          }`}
        >
          {/* SYLLABUS (first borderless row above TIME when syllabus exists) */}
          {syllabusLines.length > 0 && (
            <div className="py-3 first:pt-1">
              <div
                className={`text-[11px] font-semibold uppercase tracking-wider ${
                  isDark ? 'text-[#A1A1AA]' : 'text-slate-500'
                }`}
              >
                Syllabus
              </div>
              <div
                className={`text-sm font-medium mt-1 leading-relaxed space-y-1 ${
                  isDark ? 'text-[#F4F4F5]' : 'text-[#0F172A]'
                }`}
              >
                {syllabusLines.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          )}

          {/* TIME */}
          <div className="py-3 first:pt-1">
            <div
              className={`text-[11px] font-semibold uppercase tracking-wider ${
                isDark ? 'text-[#A1A1AA]' : 'text-slate-500'
              }`}
            >
              Time
            </div>
            <div
              className={`text-sm font-semibold mt-1 font-sans tabular-nums ${
                isDark ? 'text-[#F4F4F5]' : 'text-[#0F172A]'
              }`}
            >
              {formatTo12Hour(event.startTime)} – {formatTo12Hour(event.endTime)}
            </div>
          </div>

          {/* ROOM */}
          <div className="py-3">
            <div
              className={`text-[11px] font-semibold uppercase tracking-wider ${
                isDark ? 'text-[#A1A1AA]' : 'text-slate-500'
              }`}
            >
              Room
            </div>
            <div
              className={`text-sm font-semibold mt-1 font-sans ${
                isDark ? 'text-[#F4F4F5]' : 'text-[#0F172A]'
              }`}
            >
              {event.room || 'Room TBA'}
            </div>
          </div>

          {/* FACULTY */}
          <div className="py-3">
            <div
              className={`text-[11px] font-semibold uppercase tracking-wider ${
                isDark ? 'text-[#A1A1AA]' : 'text-slate-500'
              }`}
            >
              Faculty
            </div>
            <div className={`text-sm font-semibold mt-1 ${isDark ? 'text-[#F4F4F5]' : 'text-[#0F172A]'}`}>
              {event.teacher || 'Not designated'}
            </div>
          </div>

          {/* Assigned Lab Group (when Lab) */}
          {alternating.category === 'LAB' && (
            <div className="py-3">
              <div
                className={`text-[11px] font-semibold uppercase tracking-wider ${
                  isDark ? 'text-[#A1A1AA]' : 'text-slate-500'
                }`}
              >
                Assigned Lab Group
              </div>
              <div
                className={`text-sm font-semibold mt-1 ${
                  isDark ? 'text-[#F4F4F5]' : 'text-[#0F172A]'
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

        {/* Bottom action: Slimmer full-width pill button ("Close") */}
        <div className="pt-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRequestClose();
            }}
            className={`w-full py-2.5 px-5 rounded-full cursor-pointer font-medium text-sm leading-tight transition-all duration-150 active:scale-95 shadow-sm border ${
              isDark
                ? 'bg-[#F4F4F5] text-[#18181B] hover:bg-white border-[#F4F4F5]'
                : 'bg-[#0F172A] text-white hover:bg-slate-800 border-[#0F172A]'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
