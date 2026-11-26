import React from 'react';
import { RoutineEvent } from '../types/routine';
import { calculateSlotGeometry, formatTo12Hour } from '../utils/timeCalculations';
import { parseAlternatingSchedule } from '../utils/alternatingLabEngine';

interface SlotCardProps {
  event: RoutineEvent;
  onSelect: (event: RoutineEvent) => void;
  theme?: 'light' | 'dark';
  isDimmed?: boolean;
  isHighlighted?: boolean;
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
}) => {
  const { leftPercent, widthPercent, durationMinutes } = calculateSlotGeometry(
    event.startTime,
    event.endTime
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
        ? 'bg-transparent border-dashed border-stone-700 text-stone-500 hover:border-stone-600'
        : 'bg-transparent border-dashed border-stone-300 text-stone-400 hover:border-stone-400';
    }

    // Inverted High-Contrast Warm-Stone CT / Exam Surface
    if (isExam) {
      return isDark
        ? 'bg-stone-100 border-stone-100 text-stone-900 shadow-xs hover:bg-stone-200 hover:border-stone-200'
        : 'bg-stone-900 border-stone-900 text-stone-50 shadow-xs hover:bg-stone-800 hover:border-stone-800';
    }

    // Active Classes (Theory & Lab unified crisp stone surface)
    return isDark
      ? 'bg-[#23201D] border-stone-800 text-stone-100 shadow-xs hover:border-stone-700 hover:bg-[#2A2623]'
      : 'bg-white border-stone-300 text-stone-900 shadow-xs hover:border-stone-400';
  };

  // 0. CANCELED SLOT CARD: Completely greyed out, showing only struck-through course code + CANCELED
  if (isCancelled) {
    return (
      <div
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
        className={`absolute top-1 bottom-1 z-10 select-none cursor-pointer rounded-xs border transition-[transform,opacity] duration-150 ease-out active:scale-[0.98] flex flex-col justify-center h-[calc(100%-8px)] px-2.5 py-2 focus-visible:outline-none focus-visible:ring-1 ${
          isDark ? 'focus-visible:ring-stone-100' : 'focus-visible:ring-stone-900'
        } ${getThemeClasses()} ${isDimmed ? 'opacity-25 hover:opacity-80' : 'opacity-100'}`}
      >
        <div
          className={`font-semibold text-sm font-sans tracking-normal line-through whitespace-nowrap overflow-visible ${
            isDark ? 'text-stone-500' : 'text-stone-400'
          }`}
        >
          {courseCode}
        </div>
        <div
          className={`text-[10px] font-medium font-sans uppercase tracking-wider mt-0.5 leading-none ${
            isDark ? 'text-stone-500' : 'text-stone-400'
          }`}
        >
          CANCELED
        </div>
      </div>
    );
  }

  // 1. NARROW CT / EXAM BLOCK (<= 55 mins): Compact centered layout with two-row stacked course code
  if (isNarrowExam) {
    return (
      <div
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
        className={`absolute top-1 bottom-1 z-10 select-none cursor-pointer rounded-xs border transition-[transform,opacity,box-shadow] duration-150 ease-out active:scale-[0.98] flex flex-col justify-between items-center text-center h-[calc(100%-8px)] px-1 py-1 overflow-visible focus-visible:outline-none focus-visible:ring-1 ${
          isDark ? 'focus-visible:ring-stone-900' : 'focus-visible:ring-stone-50'
        } ${getThemeClasses()} ${isDimmed ? 'opacity-25 hover:opacity-80' : 'opacity-100'} ${
          isHighlighted ? 'ring-2 ring-emerald-500 animate-slot-pulse z-20' : ''
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
      </div>
    );
  }

  // Subline label for laboratory without rounded pill capsule
  let labSubline = '';
  if (isLab) {
    if (meta.groupTag && meta.hasReportDue) {
      labSubline = `Lab (${meta.groupTag}) · Report Due`;
    } else if (meta.groupTag) {
      labSubline = `Lab (${meta.groupTag})`;
    } else if (meta.hasReportDue) {
      labSubline = 'Lab · Report Due';
    } else {
      labSubline = 'Lab';
    }
  }

  // 2. STANDARD & WIDE EXAM SLOT CARD (THREE-TIER VERTICAL STACK)
  return (
    <div
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
      className={`absolute top-1 bottom-1 z-10 select-none cursor-pointer rounded-xs border transition-[transform,opacity,box-shadow] duration-150 ease-out active:scale-[0.98] group flex flex-col justify-between h-[calc(100%-8px)] px-2.5 py-2 focus-visible:outline-none focus-visible:ring-1 ${
        isExam
          ? isDark
            ? 'focus-visible:ring-stone-900'
            : 'focus-visible:ring-stone-50'
          : isDark
          ? 'focus-visible:ring-stone-100'
          : 'focus-visible:ring-stone-900'
      } ${getThemeClasses()} ${isDimmed ? 'opacity-25 hover:opacity-80' : 'opacity-100'} ${
        isHighlighted ? 'ring-2 ring-emerald-500 animate-slot-pulse z-20' : ''
      }`}
    >
      {/* TOP ROW: Inline uppercase EXAM/CT label or Lab group label on left, Start Time on right */}
      <div className="flex items-center justify-between gap-1.5 leading-none shrink-0 min-h-[14px] overflow-visible">
        {isExam ? (
          <span
            className={`text-[10px] font-sans font-semibold uppercase tracking-wider leading-none shrink-0 ${
              isDark ? 'text-stone-600' : 'text-stone-300'
            }`}
          >
            {wideExamPillLabel}
          </span>
        ) : isLab ? (
          <div className="min-w-0 truncate">
            <span
              className={`text-[10px] font-medium tracking-tight truncate font-sans ${
                isDark ? 'text-stone-400' : 'text-stone-500'
              }`}
            >
              {labSubline}
            </span>
          </div>
        ) : null}

        {/* Right: Start Time (e.g. "8:50 AM", "2:30 PM") */}
        <span
          className={`text-[11px] font-sans font-medium whitespace-nowrap shrink-0 tabular-nums ml-auto overflow-visible ${
            isExam
              ? isDark
                ? 'text-stone-600'
                : 'text-stone-300'
              : isDark
              ? 'text-stone-400'
              : 'text-stone-500'
          }`}
        >
          {formattedStartTime}
        </span>
      </div>

      {/* MIDDLE AREA: Full Width Spacious Course Code */}
      <div className="my-auto py-1 w-full overflow-visible">
        <div
          className={`font-semibold text-sm font-sans tracking-normal whitespace-nowrap overflow-visible ${
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

      {/* BOTTOM ROW: Room and Faculty initials together (e.g. "MSE 312 · AH") */}
      <div
        className={`text-[11px] font-sans tabular-nums shrink-0 truncate flex items-center gap-1 leading-none ${
          isExam
            ? isDark
              ? 'text-stone-600'
              : 'text-stone-300'
            : isDark
            ? 'text-stone-400'
            : 'text-stone-500'
        }`}
      >
        <span className="font-medium truncate">{event.room || 'TBA'}</span>
        {facultyInitials && (
          <>
            <span
              className={
                isExam
                  ? isDark
                    ? 'text-stone-400'
                    : 'text-stone-500'
                  : isDark
                  ? 'text-stone-600'
                  : 'text-stone-400'
              }
            >
              ·
            </span>
            <span className="font-normal truncate">{facultyInitials}</span>
          </>
        )}
      </div>
    </div>
  );
};

