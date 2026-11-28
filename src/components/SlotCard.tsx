import React from 'react';
import { motion } from 'motion/react';
import { RoutineEvent } from '../types/routine';
import {
  calculateSlotGeometry,
  formatTo12Hour,
  TOTAL_DAY_MINUTES,
} from '../utils/timeCalculations';
import { parseAlternatingSchedule } from '../utils/alternatingLabEngine';

const SLOT_CARD_SPRING = {
  type: 'spring' as const,
  stiffness: 520,
  damping: 24,
  mass: 0.7,
};

interface SlotCardProps {
  event: RoutineEvent;
  onSelect: (event: RoutineEvent) => void;
  theme?: 'light' | 'dark';
  isDimmed?: boolean;
  isHighlighted?: boolean;
  totalDayMinutes?: number;
}

/**
 * Extracts clean course code before colon (e.g. "Math 2127: Numerical Analysis" -> "Math 2127")
 */
function extractCourseCode(subject: string): string {
  if (!subject) return '';
  const colonIndex = subject.indexOf(':');
  if (colonIndex !== -1) {
    return subject.slice(0, colonIndex).trim();
  }
  return subject.trim();
}

/**
 * Splits a course code into two balanced stacked lines for narrow CT blocks
 * (e.g. "Math 2127" -> { line1: "Math", line2: "2127" }, "MSE 2101" -> { line1: "MSE", line2: "2101" })
 */
function splitCourseCodeLines(courseCode: string): { line1: string; line2: string } {
  const trimmed = (courseCode || '').trim();
  if (!trimmed) return { line1: 'CT', line2: '' };

  const codeMatch = trimmed.match(/^([A-Za-z]+(?:\s+[A-Za-z]+)*)\s*(\d{3,4}[A-Za-z]?)(?:\s+.*)?$/);
  if (codeMatch) {
    return {
      line1: codeMatch[1].trim(),
      line2: codeMatch[2].trim(),
    };
  }

  const firstSpace = trimmed.indexOf(' ');
  if (firstSpace !== -1) {
    return {
      line1: trimmed.slice(0, firstSpace).trim(),
      line2: trimmed.slice(firstSpace + 1).trim(),
    };
  }

  return { line1: trimmed, line2: '' };
}

/**
 * Compact 12-hour start time without AM/PM suffix (e.g. "15:30" -> "3:30")
 */
function formatCompactStartTime(timeStr: string): string {
  return formatTo12Hour(timeStr).replace(/\s*(am|pm)$/i, '').trim();
}

/**
 * Extracts faculty initials before hyphen or parentheses (e.g. "AH - Arman Hossain" -> "AH", "MSM & AIK (MSE)" -> "MSM & AIK")
 */
function extractFacultyInitials(teacher: string): string {
  if (!teacher) return '';
  let clean = teacher.trim();
  // Strip parentheses
  const parenIndex = clean.indexOf('(');
  if (parenIndex !== -1) {
    clean = clean.slice(0, parenIndex).trim();
  }
  // Strip hyphen if it's "Initials - Full Name"
  const hyphenIndex = clean.indexOf('-');
  if (hyphenIndex !== -1) {
    clean = clean.slice(0, hyphenIndex).trim();
  }
  return clean || teacher.trim();
}

export const SlotCard: React.FC<SlotCardProps> = ({
  event,
  onSelect,
  theme = 'light',
  isDimmed = false,
  isHighlighted = false,
  totalDayMinutes = TOTAL_DAY_MINUTES,
}) => {
  const { leftPercent, widthPercent, durationMinutes } = calculateSlotGeometry(
    event.startTime,
    event.endTime,
    totalDayMinutes
  );

  const meta = parseAlternatingSchedule(event.type, event.subject, event.syllabus);
  const isCancelled = event.status === 'Cancelled';
  const isExam = meta.category === 'EXAM';
  const isLab = meta.category === 'LAB';
  const isNarrowExam = isExam && durationMinutes <= 55 && !isCancelled;
  const isDark = theme === 'dark';

  const courseCode = extractCourseCode(event.subject);
  const stackedCourseCode = splitCourseCodeLines(courseCode);
  const facultyInitials = extractFacultyInitials(event.teacher);
  const formattedStartTime = formatTo12Hour(event.startTime);
  const compactStartTime = formatCompactStartTime(event.startTime);

  const rawTypeLower = (event.type || '').trim().toLowerCase();
  const wideExamPillLabel = rawTypeLower === 'ct' ? 'CT' : 'Exam';

  // Unified Card Theme Classes
  const getThemeClasses = () => {
    if (isCancelled) {
      return isDark
        ? 'bg-transparent border-transparent text-stone-100 hover:bg-white/[0.03]'
        : 'bg-transparent border-transparent text-stone-900 hover:bg-black/[0.025]';
    }

    // Inverted High-Contrast Warm-Stone CT / Exam Surface
    if (isExam) {
      return isDark
        ? 'bg-stone-100 border-transparent text-stone-900 hover:bg-stone-200'
        : 'bg-stone-900 border-transparent text-stone-50 hover:bg-stone-800';
    }

    // Active Classes (Theory & Lab unified crisp stone surface)
    return isDark
      ? 'bg-[#1E1D1C] border-transparent text-stone-100 hover:bg-[#242321]'
      : 'bg-white border-transparent text-stone-900 hover:bg-stone-50';
  };

  // 0. CANCELED SLOT CARD: Quiet, borderless, baseline-aligned strikethrough CourseCode only
  if (isCancelled) {
    return (
      <motion.div
        whileHover={{ scale: 1.014 }}
        whileTap={{ scale: 0.97 }}
        transition={SLOT_CARD_SPRING}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(event);
        }}
        style={{
          left: `${leftPercent}%`,
          width: `${widthPercent}%`,
          boxSizing: 'border-box',
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            onSelect(event);
          }
        }}
        title={`Canceled: ${event.subject}`}
        className={`absolute top-1 bottom-1 z-10 select-none cursor-pointer rounded-lg border transition-[opacity,background-color] duration-150 ease-out flex flex-col justify-between h-[calc(100%-8px)] px-2 py-2.5 focus-visible:outline-none focus-visible:ring-1 ${
          isDark ? 'focus-visible:ring-stone-100' : 'focus-visible:ring-stone-900'
        } ${getThemeClasses()} ${isDimmed ? 'opacity-25 hover:opacity-80' : 'opacity-100'}`}
      >
        {/* Invisible top timestamp placeholder matching active tile height */}
        <div
          aria-hidden="true"
          className="invisible flex items-center gap-1 min-w-0 shrink-0 text-[11px] font-sans font-medium leading-none tabular-nums"
        >
          <span className="whitespace-nowrap shrink-0 leading-none">{formattedStartTime}</span>
        </div>

        {/* Middle Course Code aligned on the exact same horizontal baseline as active tiles */}
        <div className="my-auto w-full overflow-visible">
          <div
            className={`font-bold text-sm font-sans tracking-tight leading-tight line-through opacity-45 whitespace-nowrap overflow-visible ${
              isDark ? 'text-stone-100' : 'text-stone-900'
            }`}
          >
            {courseCode}
          </div>
        </div>

        {/* Invisible bottom row placeholder preserving exact middle-row vertical centering */}
        <div
          aria-hidden="true"
          className="invisible text-[11px] font-sans shrink-0 leading-none"
        >
          &nbsp;
        </div>
      </motion.div>
    );
  }

  // 1. NARROW CT / EXAM BLOCK (<= 55 mins): Compact centered layout with two-row stacked course code
  if (isNarrowExam) {
    return (
      <motion.div
        whileHover={{ scale: 1.022 }}
        whileTap={{ scale: 0.962 }}
        transition={SLOT_CARD_SPRING}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(event);
        }}
        style={{
          left: `${leftPercent}%`,
          width: `${widthPercent}%`,
          boxSizing: 'border-box',
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            onSelect(event);
          }
        }}
        title={`CT / Exam: ${event.subject} [${formatTo12Hour(event.startTime)} – ${formatTo12Hour(event.endTime)}]`}
        className={`absolute top-1 bottom-1 z-10 select-none cursor-pointer rounded-lg border transition-[opacity,background-color] duration-150 ease-out flex flex-col justify-between items-center text-center h-[calc(100%-8px)] px-1 py-1 overflow-visible focus-visible:outline-none focus-visible:ring-1 ${
          isDark ? 'focus-visible:ring-stone-900' : 'focus-visible:ring-stone-50'
        } ${getThemeClasses()} ${isDimmed ? 'opacity-25 hover:opacity-80' : 'opacity-100'} ${
          isHighlighted ? 'animate-slot-pulse z-20' : ''
        }`}
      >
        <div
          className={`text-[9px] font-sans font-semibold uppercase tracking-wider leading-none shrink-0 ${
            isDark ? 'text-stone-600' : 'text-stone-300'
          }`}
        >
          {wideExamPillLabel}
        </div>
        <div
          className={`flex flex-col items-center justify-center font-sans font-bold text-[11px] sm:text-xs tracking-tight leading-[1.08] ${
            isDark ? 'text-stone-900' : 'text-stone-50'
          }`}
        >
          <span className="whitespace-nowrap">{stackedCourseCode.line1}</span>
          {stackedCourseCode.line2 && (
            <span className="tabular-nums whitespace-nowrap">{stackedCourseCode.line2}</span>
          )}
        </div>
        <div
          className={`text-[9px] font-sans font-medium tabular-nums whitespace-nowrap shrink-0 leading-none ${
            isDark ? 'text-stone-600' : 'text-stone-300'
          }`}
        >
          {compactStartTime}
        </div>
      </motion.div>
    );
  }

  // Subline label for laboratory without rounded pill capsule
  let labSubline = '';
  if (isLab) {
    if (meta.groupVariant && meta.hasReportDue) {
      labSubline = `Lab (${meta.groupVariant}) · Report Due`;
    } else if (meta.groupVariant) {
      labSubline = `Lab (${meta.groupVariant})`;
    } else if (meta.hasReportDue) {
      labSubline = 'Lab · Report Due';
    } else {
      labSubline = 'Lab';
    }
  }

  // 2. STANDARD & WIDE EXAM SLOT CARD (THREE-TIER VERTICAL STACK)
  return (
    <motion.div
      whileHover={{ scale: 1.016 }}
      whileTap={{ scale: 0.968 }}
      transition={SLOT_CARD_SPRING}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(event);
      }}
      style={{
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
        boxSizing: 'border-box',
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onSelect(event);
        }
      }}
      title={`${event.subject} [${formatTo12Hour(event.startTime)} – ${formatTo12Hour(event.endTime)}]`}
      className={`absolute top-1 bottom-1 z-10 select-none cursor-pointer rounded-lg border transition-[opacity,background-color] duration-150 ease-out group flex flex-col justify-between h-[calc(100%-8px)] px-2 py-2.5 focus-visible:outline-none focus-visible:ring-1 ${
        isExam
          ? isDark
            ? 'focus-visible:ring-stone-900'
            : 'focus-visible:ring-stone-50'
          : isDark
          ? 'focus-visible:ring-stone-100'
          : 'focus-visible:ring-stone-900'
      } ${getThemeClasses()} ${isDimmed ? 'opacity-25 hover:opacity-80' : 'opacity-100'} ${
        isHighlighted ? 'animate-slot-pulse z-20' : ''
      }`}
    >
      {/* TOP ROW: Left-aligned muted metadata line (e.g. "9:40 AM", "10:40 AM · Lab (A)", "9:40 AM · Exam") */}
      <div
        className={`flex items-center gap-1 min-w-0 shrink-0 text-[11px] font-sans font-medium leading-none tabular-nums ${
          isExam
            ? isDark
              ? 'text-stone-600'
              : 'text-stone-300'
            : isDark
            ? 'text-stone-400'
            : 'text-stone-500'
        }`}
      >
        <span className="whitespace-nowrap shrink-0 leading-none">{formattedStartTime}</span>
        {isExam ? (
          <>
            <span
              className={`shrink-0 leading-none ${
                isDark ? 'text-stone-400' : 'text-stone-500'
              }`}
            >
              ·
            </span>
            <span className="truncate min-w-0 leading-none font-semibold">
              {wideExamPillLabel}
            </span>
          </>
        ) : isLab ? (
          <>
            <span
              className={`shrink-0 leading-none ${
                isDark ? 'text-stone-600' : 'text-stone-400'
              }`}
            >
              ·
            </span>
            <span className="truncate min-w-0 leading-none tracking-tight">
              {labSubline}
            </span>
          </>
        ) : null}
      </div>

      {/* MIDDLE AREA: Left-aligned bold Course Code */}
      <div className="my-auto w-full overflow-visible">
        <div
          className={`font-bold text-sm font-sans tracking-tight leading-tight whitespace-nowrap overflow-visible ${
            isExam
              ? isDark
                ? 'text-stone-900'
                : 'text-stone-50'
              : isDark
              ? 'text-stone-100'
              : 'text-stone-900'
          }`}
        >
          {courseCode}
        </div>
      </div>

      {/* BOTTOM ROW: Room and Faculty initials together (e.g. "MSE 312 · SA") */}
      <div
        className={`text-[11px] font-sans tabular-nums shrink-0 min-w-0 flex items-center gap-1 leading-none overflow-hidden ${
          isExam
            ? isDark
              ? 'text-stone-600'
              : 'text-stone-300'
            : isDark
            ? 'text-stone-400'
            : 'text-stone-500'
        }`}
      >
        <span className="font-medium shrink-0 whitespace-nowrap">{event.room || 'TBA'}</span>
        {facultyInitials && (
          <>
            <span
              className={`shrink-0 ${
                isExam
                  ? isDark
                    ? 'text-stone-400'
                    : 'text-stone-500'
                  : isDark
                  ? 'text-stone-600'
                  : 'text-stone-400'
              }`}
            >
              ·
            </span>
            <span className="font-normal truncate min-w-0">{facultyInitials}</span>
          </>
        )}
      </div>
    </motion.div>
  );
};

