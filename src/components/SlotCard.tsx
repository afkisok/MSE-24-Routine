import React from 'react';
import { RoutineEvent } from '../types/routine';
import { calculateSlotGeometry, formatTo12Hour } from '../utils/timeCalculations';
import { parseAlternatingSchedule } from '../utils/alternatingLabEngine';
import { FileText } from 'lucide-react';

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
  const isCompactExam = isExam && durationMinutes < 35 && !isCancelled;
  const isDark = theme === 'dark';

  const courseCode = extractCourseCode(event.subject);
  const facultyInitials = extractFacultyInitials(event.teacher);
  const formattedStartTime = formatTo12Hour(event.startTime);

  // Card theme classes
  const getThemeClasses = () => {
    if (isCancelled) {
      return isDark
        ? 'bg-transparent border-dashed border-slate-700 text-slate-500 hover:border-slate-600'
        : 'bg-transparent border-dashed border-slate-300 text-slate-400 hover:border-slate-400';
    }

    if (isCompactExam) {
      return isDark
        ? 'compact-exam bg-[#D97706] border-[#F59E0B] text-white shadow-xs hover:bg-[#F59E0B] hover:text-slate-950'
        : 'compact-exam bg-[#D97706] border-[#B45309] text-white shadow-xs hover:bg-[#B45309]';
    }

    if (isExam) {
      return isDark
        ? 'bg-[#27272A] border-amber-500/80 text-amber-100 shadow-xs hover:border-amber-400'
        : 'bg-amber-50/90 border-[#D97706] text-[#78350F] shadow-xs hover:bg-amber-100/90 hover:border-[#B45309]';
    }

    // Active Classes (Theory & Lab unified crisp surface)
    return isDark
      ? 'bg-[#1F1F23] border-[#3F3F46] text-[#FAFAFA] shadow-xs hover:border-slate-400 hover:bg-[#27272A]'
      : 'bg-white border-slate-300 text-[#09090B] shadow-xs hover:border-slate-400';
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
          isDark ? 'focus-visible:ring-white' : 'focus-visible:ring-[#0F172A]'
        } ${getThemeClasses()} ${isDimmed ? 'opacity-25 hover:opacity-80' : 'opacity-100'}`}
      >
        <div
          className={`font-semibold text-sm font-sans tracking-normal line-through whitespace-nowrap overflow-visible ${
            isDark ? 'text-slate-500' : 'text-slate-400'
          }`}
        >
          {courseCode}
        </div>
        <div
          className={`text-[10px] font-medium font-sans uppercase tracking-wider mt-0.5 leading-none ${
            isDark ? 'text-slate-500' : 'text-slate-400'
          }`}
        >
          CANCELED
        </div>
      </div>
    );
  }

  // 1. NARROW EXAM COMPACT CARD (< 35 mins)
  if (isCompactExam) {
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
          padding: '4px 3px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          overflow: 'visible',
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
        title={`Exam / CT: ${event.subject} [${formatTo12Hour(event.startTime)} – ${formatTo12Hour(event.endTime)}]`}
        className={`absolute top-1 bottom-1 z-10 select-none cursor-pointer rounded-xs border transition-[transform,opacity] duration-150 ease-out active:scale-[0.98] group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white ${getThemeClasses()} ${
          isDimmed ? 'opacity-25 hover:opacity-80' : 'opacity-100'
        } ${isHighlighted ? 'ring-2 ring-emerald-500 animate-slot-pulse z-20' : ''}`}
      >
        <div className="text-[9px] font-sans font-semibold tracking-normal uppercase opacity-95 shrink-0 leading-none">
          Exam
        </div>
        <div className="my-auto flex flex-col items-center justify-center text-center">
          <span className="font-sans font-bold text-xs sm:text-sm tracking-normal uppercase leading-none drop-shadow-2xs">
            CT
          </span>
        </div>
        <div className="text-[9px] font-sans font-semibold tabular-nums whitespace-nowrap shrink-0 leading-none opacity-95">
          {formattedStartTime}
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

  // 2. STANDARD UNBOXED SLOT CARD (THREE-TIER VERTICAL STACK)
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
        isDark ? 'focus-visible:ring-white' : 'focus-visible:ring-[#0F172A]'
      } ${getThemeClasses()} ${isDimmed ? 'opacity-25 hover:opacity-80' : 'opacity-100'} ${
        isHighlighted ? 'ring-2 ring-emerald-500 animate-slot-pulse z-20' : ''
      }`}
    >
      {/* SOLID AMBER BANNER FOR REGULAR EXAM / CT ONLY (high-priority indicator retained) */}
      {isExam && (
        <div
          className={`-mx-2.5 -mt-2 px-2.5 py-0.5 mb-1 flex items-center justify-between text-[9px] font-semibold font-sans tracking-normal uppercase shrink-0 border-b ${
            isDark
              ? 'bg-[#B45309] text-amber-50 border-amber-600/50'
              : 'bg-[#D97706] text-white border-amber-700'
          }`}
        >
          <span className="flex items-center gap-1">
            <FileText className="w-2.5 h-2.5 text-amber-200" />
            Exam / CT
          </span>
          <span className="text-[8px] font-sans font-medium tabular-nums truncate ml-1 opacity-95">
            {event.marks || 'Assessment'}
          </span>
        </div>
      )}

      {/* TOP ROW: Micro metadata only */}
      <div className="flex items-center justify-between gap-1.5 leading-none shrink-0 min-h-[14px] overflow-visible">
        {/* Left: Lab group indicator */}
        {isLab && (
          <div className="min-w-0 truncate">
            <span
              className={`text-[10px] font-medium tracking-tight truncate font-sans ${
                isDark ? 'text-zinc-400' : 'text-zinc-500'
              }`}
            >
              {labSubline}
            </span>
          </div>
        )}

        {/* Right: Start Time (e.g. "8:50 AM", "2:30 PM") */}
        <span
          className={`text-[11px] font-sans font-medium whitespace-nowrap shrink-0 tabular-nums ml-auto overflow-visible ${
            isExam
              ? isDark
                ? 'text-amber-300 font-semibold'
                : 'text-amber-900 font-semibold'
              : isDark
              ? 'text-zinc-400'
              : 'text-zinc-500'
          }`}
        >
          {formattedStartTime}
        </span>
      </div>

      {/* MIDDLE AREA: Full Width Spacious Course Code with no sibling elements */}
      <div className="my-auto py-1 w-full overflow-visible">
        <div
          className={`font-semibold text-sm font-sans tracking-normal whitespace-nowrap overflow-visible ${
            isExam
              ? isDark
                ? 'text-amber-100'
                : 'text-[#78350F]'
              : isDark
              ? 'text-zinc-100'
              : 'text-[#09090B]'
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
              ? 'text-amber-200/90'
              : 'text-amber-900/90'
            : isDark
            ? 'text-zinc-400'
            : 'text-zinc-500'
        }`}
      >
        <span className="font-medium truncate">{event.room || 'TBA'}</span>
        {facultyInitials && (
          <>
            <span className={isExam ? 'text-amber-500/50' : isDark ? 'text-zinc-600' : 'text-zinc-400'}>
              ·
            </span>
            <span className="font-normal truncate">{facultyInitials}</span>
          </>
        )}
      </div>
    </div>
  );
};

