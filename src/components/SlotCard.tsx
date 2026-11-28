import React, { useCallback, useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { RoutineEvent } from '../types/routine';
import {
  calculateSlotGeometry,
  formatTo12Hour,
  TOTAL_DAY_MINUTES,
} from '../utils/timeCalculations';
import { parseAlternatingSchedule } from '../utils/alternatingLabEngine';
import {
  CARD_INTERACTION_SPRING,
  startupPopTransition,
  VIEW_TRANSITION,
} from '../utils/springs';

const TILE_LIFT_SPRING = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 16,
  mass: 0.78,
};

const TILE_SHADOW_LIFT_SPRING = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 20,
  mass: 0.8,
};

const TILE_DROP_SPRING = {
  type: 'spring' as const,
  stiffness: 340,
  damping: 18,
  mass: 0.85,
};

const TILE_SHADOW_DROP_SPRING = {
  type: 'spring' as const,
  stiffness: 340,
  damping: 24,
  mass: 0.85,
};

interface SlotCardProps {
  event: RoutineEvent;
  onSelect: (event: RoutineEvent) => void;
  theme?: 'light' | 'dark';
  isDimmed?: boolean;
  isHighlighted?: boolean;
  highlightPhase?: 'lifted' | 'settling' | null;
  highlightSeq?: number;
  totalDayMinutes?: number;
  startupDelay?: number;
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
  highlightPhase = null,
  highlightSeq = 0,
  totalDayMinutes = TOTAL_DAY_MINUTES,
  startupDelay = 0.38,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [hasEntered, setHasEntered] = useState(false);
  const [isLifting, setIsLifting] = useState(false);

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

  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;
  const isExamRef = useRef(isExam);
  isExamRef.current = isExam;
  const isLiftingRef = useRef(false);
  isLiftingRef.current = isLifting;

  const liftY = useMotionValue(0);
  const liftScale = useMotionValue(1);
  const shadowProgress = useMotionValue(0);

  const liftBoxShadow = useTransform(shadowProgress, (rawP) => {
    const p = Math.max(0, Math.min(1.18, rawP));
    if (p <= 0.004) return 'none';

    const dark = isDarkRef.current;
    const exam = isExamRef.current;

    if (dark) {
      const y1 = (p * 4).toFixed(2);
      const blur1 = (p * 10).toFixed(2);
      const a1 = Math.min(0.55, p * 0.44).toFixed(3);

      const y2 = (p * 14).toFixed(2);
      const blur2 = (p * 28).toFixed(2);
      const spread2 = (-p * 4).toFixed(2);
      const a2 = Math.min(0.74, p * 0.6).toFixed(3);

      const rimAlpha = (p * (exam ? 0.22 : 0.09)).toFixed(3);
      return `0 ${y1}px ${blur1}px rgba(0, 0, 0, ${a1}), 0 ${y2}px ${blur2}px ${spread2}px rgba(0, 0, 0, ${a2}), 0 0 0 1px rgba(255, 255, 255, ${rimAlpha})`;
    }

    const y1 = (p * 3).toFixed(2);
    const blur1 = (p * 8).toFixed(2);
    const a1 = (p * (exam ? 0.14 : 0.08)).toFixed(3);

    const y2 = (p * 13).toFixed(2);
    const blur2 = (p * 26).toFixed(2);
    const spread2 = (-p * 4).toFixed(2);
    const a2 = (p * (exam ? 0.26 : 0.18)).toFixed(3);

    const rimAlpha = (p * (exam ? 0.12 : 0.06)).toFixed(3);
    return `0 ${y1}px ${blur1}px rgba(28, 25, 23, ${a1}), 0 ${y2}px ${blur2}px ${spread2}px rgba(28, 25, 23, ${a2}), 0 0 0 1px rgba(28, 25, 23, ${rimAlpha})`;
  });

  const highlightControlsRef = useRef<Array<{ stop: () => void }>>([]);
  const highlightCycleIdRef = useRef(0);

  const stopHighlightAnimations = useCallback(() => {
    highlightControlsRef.current.forEach((ctrl) => ctrl.stop());
    highlightControlsRef.current = [];
  }, []);

  useEffect(() => {
    // Phase 1: Lift & expand with spring physics and keep poised while viewport shifts + scaled dwell
    if (isHighlighted && highlightPhase === 'lifted') {
      setHasEntered(true);
      setIsLifting(true);
      stopHighlightAnimations();
      highlightCycleIdRef.current += 1;

      if (shouldReduceMotion) {
        liftY.jump(0);
        liftScale.jump(1);
        highlightControlsRef.current.push(
          animate(shadowProgress, 1, VIEW_TRANSITION)
        );
        return;
      }

      highlightControlsRef.current.push(
        animate(liftY, -7.5, TILE_LIFT_SPRING),
        animate(liftScale, 1.068, TILE_LIFT_SPRING),
        animate(shadowProgress, 1, TILE_SHADOW_LIFT_SPRING)
      );
      return;
    }

    // Phase 2: After distance-scaled dwell once viewport finishes shifting (or if jump switched elsewhere), spring back to zero
    if ((isHighlighted && highlightPhase === 'settling') || (!isHighlighted && isLiftingRef.current)) {
      stopHighlightAnimations();
      const cycleId = ++highlightCycleIdRef.current;

      if (shouldReduceMotion) {
        liftY.jump(0);
        liftScale.jump(1);
        const fadeOut = animate(shadowProgress, 0, VIEW_TRANSITION);
        highlightControlsRef.current.push(fadeOut);
        fadeOut.then(() => {
          if (highlightCycleIdRef.current !== cycleId) return;
          shadowProgress.jump(0);
          setIsLifting(false);
        });
        return;
      }

      const dropY = animate(liftY, 0, TILE_DROP_SPRING);
      const dropScale = animate(liftScale, 1, TILE_DROP_SPRING);
      const dropShadow = animate(shadowProgress, 0, TILE_SHADOW_DROP_SPRING);
      highlightControlsRef.current.push(dropY, dropScale, dropShadow);

      Promise.all([dropY, dropScale, dropShadow]).then(() => {
        if (highlightCycleIdRef.current !== cycleId) return;
        liftY.jump(0);
        liftScale.jump(1);
        shadowProgress.jump(0);
        setIsLifting(false);
      });
    }
  }, [
    isHighlighted,
    highlightPhase,
    highlightSeq,
    liftScale,
    liftY,
    shadowProgress,
    shouldReduceMotion,
    stopHighlightAnimations,
  ]);

  useEffect(() => {
    return () => {
      highlightCycleIdRef.current += 1;
      stopHighlightAnimations();
    };
  }, [stopHighlightAnimations]);

  useEffect(() => {
    if (hasEntered) return;
    const timer = window.setTimeout(() => {
      setHasEntered(true);
    }, Math.round(startupDelay * 1000) + 420);
    return () => window.clearTimeout(timer);
  }, [hasEntered, startupDelay]);

  const entryTransition = hasEntered
    ? CARD_INTERACTION_SPRING
    : startupPopTransition(startupDelay, 0.2);

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
        initial={{ opacity: 0, y: 7, scale: 0.955 }}
        animate={{ opacity: isDimmed ? 0.25 : 1, y: 0, scale: 1 }}
        whileHover={{ scale: 1.014, opacity: isDimmed ? 0.8 : 1 }}
        whileTap={{ scale: 0.97 }}
        transition={entryTransition}
        onHoverStart={() => {
          if (!hasEntered) setHasEntered(true);
        }}
        onAnimationComplete={() => {
          if (!hasEntered) setHasEntered(true);
        }}
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
        className={`absolute top-1 bottom-1 z-10 select-none cursor-pointer rounded-xl border transition-colors duration-150 ease-out flex flex-col justify-between h-[calc(100%-8px)] p-2.5 focus-visible:outline-none focus-visible:ring-1 ${
          isDark ? 'focus-visible:ring-stone-100' : 'focus-visible:ring-stone-900'
        } ${getThemeClasses()}`}
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
        initial={{ opacity: 0, y: 7, scale: 0.945 }}
        animate={{ opacity: isDimmed ? 0.25 : 1, y: 0, scale: 1 }}
        whileHover={{ scale: 1.022, opacity: isDimmed ? 0.8 : 1 }}
        whileTap={{ scale: 0.962 }}
        transition={entryTransition}
        onHoverStart={() => {
          if (!hasEntered) setHasEntered(true);
        }}
        onAnimationComplete={() => {
          if (!hasEntered) setHasEntered(true);
        }}
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
        className={`absolute top-1 bottom-1 select-none cursor-pointer rounded-xl h-[calc(100%-8px)] overflow-visible focus-visible:outline-none focus-visible:ring-1 ${
          isDark ? 'focus-visible:ring-stone-900' : 'focus-visible:ring-stone-50'
        } ${isHighlighted || isLifting ? 'z-20' : 'z-10'}`}
      >
        <motion.div
          style={{
            y: liftY,
            scale: liftScale,
            boxShadow: liftBoxShadow,
          }}
          className={`w-full h-full rounded-xl border transition-colors duration-150 ease-out flex flex-col justify-between items-center text-center p-1.5 overflow-visible will-change-transform ${getThemeClasses()}`}
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
      initial={{ opacity: 0, y: 7, scale: 0.955 }}
      animate={{ opacity: isDimmed ? 0.25 : 1, y: 0, scale: 1 }}
      whileHover={{ scale: 1.016, opacity: isDimmed ? 0.8 : 1 }}
      whileTap={{ scale: 0.968 }}
      transition={entryTransition}
      onHoverStart={() => {
        if (!hasEntered) setHasEntered(true);
      }}
      onAnimationComplete={() => {
        if (!hasEntered) setHasEntered(true);
      }}
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
      className={`absolute top-1 bottom-1 select-none cursor-pointer rounded-xl h-[calc(100%-8px)] focus-visible:outline-none focus-visible:ring-1 ${
        isExam
          ? isDark
            ? 'focus-visible:ring-stone-900'
            : 'focus-visible:ring-stone-50'
          : isDark
          ? 'focus-visible:ring-stone-100'
          : 'focus-visible:ring-stone-900'
      } ${isHighlighted || isLifting ? 'z-20' : 'z-10'}`}
    >
      <motion.div
        style={{
          y: liftY,
          scale: liftScale,
          boxShadow: liftBoxShadow,
        }}
        className={`w-full h-full rounded-xl border transition-colors duration-150 ease-out group flex flex-col justify-between p-2.5 will-change-transform ${getThemeClasses()}`}
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
    </motion.div>
  );
};

