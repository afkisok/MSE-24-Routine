import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { RoutineEvent, TermFinalExam } from '../types/routine';
import { timeToMinutes, formatTo12Hour } from '../utils/timeCalculations';
import { parseAlternatingSchedule } from '../utils/alternatingLabEngine';
import {
  getTermFinalRelativeLabel,
  getTermFinalTimestamps,
  isTermFinalUpcoming,
  sortTermFinalsChronologically,
} from '../utils/termFinalUtils';

interface AtAGlanceWidgetProps {
  events: RoutineEvent[];
  onSelectEvent: (event: RoutineEvent) => void;
  theme?: 'light' | 'dark';
  selectedGroup?: 'All' | 'Group A' | 'Group B';
  assignmentsCount?: number;
  onOpenAssignments?: () => void;
  isTermFinalMode?: boolean;
  termFinals?: TermFinalExam[];
  nowMs?: number;
  onSelectTermFinal?: (exam: TermFinalExam) => void;
}

const DAY_TO_WEEKDAY: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

export const AtAGlanceWidget: React.FC<AtAGlanceWidgetProps> = ({
  events,
  onSelectEvent,
  theme = 'light',
  selectedGroup = 'All',
  assignmentsCount = 0,
  onOpenAssignments,
  isTermFinalMode = false,
  termFinals = [],
  nowMs,
  onSelectTermFinal,
}) => {
  const isDark = theme === 'dark';
  const effectiveNowMs = nowMs ?? Date.now();
  const now = new Date(effectiveNowMs);
  const todayDayNum = now.getDay();
  const currentMins = now.getHours() * 60 + now.getMinutes();

  const VIEW_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
  const HERO_TILE_PRESS_SPRING = {
    type: 'spring' as const,
    stiffness: 390,
    damping: 28,
    mass: 0.95,
  };
  const HERO_VIEW_SPRING = {
    type: 'spring' as const,
    stiffness: 390,
    damping: 32,
    mass: 0.95,
  };

  const renderHeader = (title: string) => (
    <div className="flex items-end justify-between gap-2 mb-3 px-1">
      <div className="relative pb-0.5 min-w-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.h2
            key={title}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: VIEW_EASE }}
            className={`font-['Newsreader',Georgia,serif] text-[1.1875rem] font-semibold tracking-[-0.015em] leading-snug ${
              isDark ? 'text-stone-100' : 'text-stone-900'
            }`}
          >
            {title}
          </motion.h2>
        </AnimatePresence>
      </div>

      {onOpenAssignments && (
        <button
          type="button"
          onClick={onOpenAssignments}
          className={`relative h-9 px-3.5 py-0 rounded-full text-xs font-medium leading-none inline-flex items-center justify-center border transition-all duration-150 active:scale-95 cursor-pointer select-none ${
            isDark
              ? 'bg-[#1E1D1C] border-transparent text-stone-100 hover:bg-[#262523]'
              : 'bg-white border-transparent text-stone-900 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] hover:bg-stone-50'
          }`}
        >
          {assignmentsCount > 0 && (
            <span
              className={`absolute top-0 right-0 w-2.5 h-2.5 rounded-full ring-2 pointer-events-none bg-[#9E2C2C] ${
                isDark ? 'ring-[#161514]' : 'ring-[#F4F3EF]'
              }`}
              aria-hidden="true"
            />
          )}
          <span className="leading-none">Assignments</span>
        </button>
      )}
    </div>
  );

  const parseHeroRooms = (rawRoom?: string): string[] => {
    const trimmed = (rawRoom || '').trim();
    if (!trimmed) return ['TBA'];
    const parts = trimmed
      .split(/\s*[&/,]\s*/)
      .map((part) => part.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts : ['TBA'];
  };

  const formatRemainingDuration = (remainingMs: number): string => {
    const remainingMins = Math.max(1, Math.ceil(remainingMs / 60000));
    if (remainingMins < 60) return `${remainingMins}m left`;
    const hrs = Math.floor(remainingMins / 60);
    const mins = remainingMins % 60;
    return mins === 0 ? `${hrs}h left` : `${hrs}h ${mins}m left`;
  };

  const renderHeroRoomBlock = (rawRoom?: string) => {
    const rooms = parseHeroRooms(rawRoom);
    const isMultiRoom = rooms.length > 1;

    return (
      <div className="shrink-0 text-right mt-[2px]">
        <div className="text-[10px] font-medium uppercase tracking-wider leading-none text-neutral-400">
          {isMultiRoom ? 'ROOMS' : 'ROOM'}
        </div>
        <div
          className={`mt-1 flex flex-col items-end text-xl font-bold tracking-tight leading-tight tabular-nums ${
            isDark ? 'text-stone-100' : 'text-stone-900'
          }`}
        >
          {rooms.map((room, idx) => (
            <span key={`${room}-${idx}`} className="whitespace-nowrap">
              {room}
            </span>
          ))}
        </div>
      </div>
    );
  };

  // TERM FINAL MODE: UPCOMING EXAMS BODY
  const upcomingFinals = isTermFinalMode
    ? sortTermFinalsChronologically(termFinals).filter((exam) =>
        isTermFinalUpcoming(exam, effectiveNowMs)
      )
    : [];
  const heroExam = upcomingFinals[0] || null;
  const remainingExams = upcomingFinals.slice(1);

  const renderTermFinalBody = () => (
    <>

        {upcomingFinals.length === 0 ? (
          <div
            className={`py-5 text-center text-xs font-sans ${
              isDark ? 'text-stone-400' : 'text-stone-500'
            }`}
          >
            No upcoming exams in queue
          </div>
        ) : (
          <div className="flex flex-col">
            {heroExam && (() => {
              const relativeLabel = getTermFinalRelativeLabel(heroExam, effectiveNowMs);
              const { startMs, endMs } = getTermFinalTimestamps(heroExam);
              const isLiveNow = effectiveNowMs >= startMs && effectiveNowMs < endMs;
              const liveProgressPercent = isLiveNow
                ? Math.max(
                    0,
                    Math.min(100, ((effectiveNowMs - startMs) / Math.max(60000, endMs - startMs)) * 100)
                  )
                : 0;
              const remainingLabel = isLiveNow ? formatRemainingDuration(endMs - effectiveNowMs) : '';

              const datePrefix =
                relativeLabel === 'Active Now'
                  ? heroExam.displayDate
                  : relativeLabel
                  ? `${relativeLabel}, ${heroExam.displayDate}`
                  : `${heroExam.weekdayShort}, ${heroExam.displayDate}`;
              const timeRange = `${formatTo12Hour(heroExam.startTime)} – ${formatTo12Hour(heroExam.endTime)}`;

              return (
                <motion.div
                  whileTap={{ scale: 0.985 }}
                  transition={HERO_TILE_PRESS_SPRING}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTermFinal?.(heroExam);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      onSelectTermFinal?.(heroExam);
                    }
                  }}
                  className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 cursor-pointer transition-[background-color,box-shadow] duration-200 border will-change-transform ${
                    isDark
                      ? 'bg-[#1E1D1C] border-transparent text-stone-100 shadow-[0_2px_6px_rgba(0,0,0,0.28),0_10px_24px_-6px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.04)] hover:bg-[#242321] hover:shadow-[0_3px_8px_rgba(0,0,0,0.34),0_14px_28px_-6px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]'
                      : 'bg-white border-transparent text-stone-900 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_6px_18px_-4px_rgba(28,25,23,0.08)] hover:bg-stone-50/70 hover:shadow-[0_2px_4px_rgba(28,25,23,0.05),0_10px_24px_-6px_rgba(28,25,23,0.11)]'
                  }`}
                >
                  {/* Top Row: Course Code + Title (left) & Co-Star ROOM Readout (right) */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <div
                        className={`text-xl font-bold tracking-tight leading-none ${
                          isDark ? 'text-stone-100' : 'text-stone-900'
                        }`}
                      >
                        {heroExam.courseCode}
                        <span
                          className={`font-semibold ${
                            isDark ? 'text-neutral-400' : 'text-neutral-500'
                          }`}
                        >
                          {' · Term Final'}
                        </span>
                      </div>
                      {heroExam.courseTitle && (
                        <div
                          className={`mt-1.5 text-sm font-normal leading-snug ${
                            isDark ? 'text-neutral-400' : 'text-neutral-500'
                          }`}
                        >
                          {heroExam.courseTitle}
                        </div>
                      )}
                    </div>

                    {renderHeroRoomBlock(heroExam.room)}
                  </div>

                  {/* Bottom Row: Live Status Tracker or High-Contrast Day & Time Range */}
                  <div
                    className={`mt-3 pt-2.5 border-t flex items-center justify-between gap-2 ${
                      isDark ? 'border-white/[0.06]' : 'border-black/5'
                    }`}
                  >
                    {isLiveNow ? (
                      <>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-[#9E2C2C] animate-pulse shrink-0"
                            aria-hidden="true"
                          />
                          <span className="text-[14px] sm:text-[15px] font-semibold leading-snug text-[#9E2C2C] shrink-0">
                            Happening now
                          </span>
                          <span
                            className={isDark ? 'text-neutral-600' : 'text-neutral-300'}
                            aria-hidden="true"
                          >
                            ·
                          </span>
                          <span
                            className={`text-[14px] sm:text-[15px] font-semibold font-sans tabular-nums leading-snug truncate ${
                              isDark ? 'text-stone-100' : 'text-stone-900'
                            }`}
                          >
                            {remainingLabel}
                          </span>
                        </div>
                        <span
                          className={`text-xs font-medium font-sans tabular-nums shrink-0 ${
                            isDark ? 'text-neutral-400' : 'text-neutral-500'
                          }`}
                        >
                          until {formatTo12Hour(heroExam.endTime)}
                        </span>
                      </>
                    ) : (
                      <span
                        className={`text-[15px] font-semibold font-sans tabular-nums leading-snug ${
                          isDark ? 'text-stone-100' : 'text-stone-900'
                        }`}
                      >
                        {datePrefix} · {timeRange}
                      </span>
                    )}
                  </div>

                  {/* Flush 2.5px bottom progress bar when exam is currently in session */}
                  {isLiveNow && (
                    <div
                      aria-hidden="true"
                      className={`absolute inset-x-0 bottom-0 h-[2.5px] pointer-events-none ${
                        isDark ? 'bg-white/[0.08]' : 'bg-black/[0.06]'
                      }`}
                    >
                      <div
                        className={`h-full transition-[width] duration-700 ease-out ${
                          isDark ? 'bg-[#C94A4A]' : 'bg-[#9E2C2C]'
                        }`}
                        style={{ width: `${liveProgressPercent}%` }}
                      />
                    </div>
                  )}
                </motion.div>
              );
            })()}

            {/* Remaining Upcoming Term Final Exams */}
            {remainingExams.length > 0 && (
              <div
                className={`mt-2 divide-y ${
                  isDark ? 'divide-stone-800' : 'divide-stone-200'
                }`}
              >
                {remainingExams.map((exam) => {
                  const relativeLabel = getTermFinalRelativeLabel(exam, effectiveNowMs);
                  const dateTimeCompact =
                    relativeLabel === 'Active Now'
                      ? `${exam.displayDate}, ${formatTo12Hour(exam.startTime)}`
                      : `${relativeLabel || exam.displayDate}, ${formatTo12Hour(exam.startTime)}`;

                  return (
                    <div
                      key={exam.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTermFinal?.(exam);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          onSelectTermFinal?.(exam);
                        }
                      }}
                      className={`py-2.5 px-2 flex items-center justify-between gap-3 cursor-pointer rounded-lg transition-all duration-150 ease-out active:scale-[0.98] ${
                        isDark ? 'hover:bg-[#1C1A18]' : 'hover:bg-stone-100'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`text-xs font-medium font-sans tabular-nums shrink-0 ${
                            isDark ? 'text-stone-400' : 'text-stone-500'
                          }`}
                        >
                          {dateTimeCompact}
                        </span>
                        <span
                          className={`text-xs sm:text-sm font-semibold tracking-normal truncate ${
                            isDark ? 'text-stone-100' : 'text-stone-900'
                          }`}
                        >
                          {exam.courseCode}
                        </span>
                      </div>

                      <span
                        className={`text-xs font-sans tabular-nums shrink-0 ${
                          isDark ? 'text-stone-400' : 'text-stone-500'
                        }`}
                      >
                        {exam.room || 'TBA'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
    </>
  );

  // STANDARD WEEKLY MODE: UPCOMING CLASSES
  const getUpcomingEvents = (): { event: RoutineEvent; relativeLabel: string }[] => {
    // Filter active classes and respect section/group filter
    const activeEvents = events.filter((e) => {
      if (e.status === 'Cancelled') return false;
      if (!selectedGroup || selectedGroup === 'All') return true;
      const meta = parseAlternatingSchedule(e.type, e.subject, e.syllabus);
      if (selectedGroup === 'Group A') {
        return meta.groupVariant !== 'B';
      }
      if (selectedGroup === 'Group B') {
        return meta.groupVariant !== 'A';
      }
      return true;
    });

    if (activeEvents.length === 0) return [];

    const upcoming: { event: RoutineEvent; relativeLabel: string; sortScore: number }[] = [];

    activeEvents.forEach((evt) => {
      const targetDayNum = DAY_TO_WEEKDAY[evt.day];
      if (targetDayNum === undefined) return;

      const evtStartMins = timeToMinutes(evt.startTime);
      const rawEndMins = timeToMinutes(evt.endTime);
      const evtEndMins = rawEndMins > evtStartMins ? rawEndMins : evtStartMins + 50;

      let dayDiff = (targetDayNum - todayDayNum + 7) % 7;

      // Advance immediately the moment the current session ends
      if (dayDiff === 0 && currentMins >= evtEndMins) {
        dayDiff = 7;
      }

      let relativeBadge = '';
      if (dayDiff === 0) {
        if (currentMins < evtStartMins) {
          const diffMins = evtStartMins - currentMins;
          if (diffMins < 60) {
            relativeBadge = `in ${diffMins}m`;
          } else {
            relativeBadge = 'Today';
          }
        } else {
          relativeBadge = 'Active Now';
        }
      } else if (dayDiff === 1) {
        relativeBadge = 'Tomorrow';
      }

      const sortScore = dayDiff * 1440 + evtStartMins;
      upcoming.push({ event: evt, relativeLabel: relativeBadge, sortScore });
    });

    upcoming.sort((a, b) => a.sortScore - b.sortScore);
    return upcoming.slice(0, 3).map((u) => ({ event: u.event, relativeLabel: u.relativeLabel }));
  };

  const upcomingList = getUpcomingEvents();

  const splitSubject = (subject: string): { code: string; title: string } => {
    if (!subject) return { code: '', title: '' };
    const colonIndex = subject.indexOf(':');
    if (colonIndex !== -1) {
      return {
        code: subject.slice(0, colonIndex).trim(),
        title: subject.slice(colonIndex + 1).trim(),
      };
    }
    return { code: subject.trim(), title: '' };
  };

  const formatInlineDayTime = (event: RoutineEvent, relativeLabel: string, includeEnd = false) => {
    const start = formatTo12Hour(event.startTime);
    if (relativeLabel === 'Active Now') {
      return includeEnd ? `${start} – ${formatTo12Hour(event.endTime)}` : start;
    }
    const dayPrefix = relativeLabel || event.day;
    if (includeEnd) {
      return `${dayPrefix}, ${start} – ${formatTo12Hour(event.endTime)}`;
    }
    return `${dayPrefix}, ${start}`;
  };

  const heroItem = upcomingList[0] || null;
  const secondaryItems = upcomingList.slice(1);

  return (
    <section className="mb-6 select-none">
      {renderHeader(isTermFinalMode ? 'Upcoming Exams' : 'Upcoming Classes')}

      <AnimatePresence mode="wait" initial={false}>
        {isTermFinalMode ? (
          <motion.div
            key="term-finals-widget"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={HERO_VIEW_SPRING}
          >
            {renderTermFinalBody()}
          </motion.div>
        ) : (
          <motion.div
            key="weekly-classes-widget"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={HERO_VIEW_SPRING}
          >

      {upcomingList.length === 0 ? (
        <div
          className={`py-5 text-center text-xs font-sans ${
            isDark ? 'text-stone-400' : 'text-stone-500'
          }`}
        >
          No upcoming classes in queue
        </div>
      ) : (
        <div className="flex flex-col">
          {/* 1st (Closest) Upcoming Class: Crisp Elevated Hero Card */}
          {heroItem && (() => {
            const { event, relativeLabel } = heroItem;
            const { code, title } = splitSubject(event.subject);
            const alternating = parseAlternatingSchedule(event.type, event.subject, event.syllabus);
            const heroTypeStatus = `${event.type || ''} ${event.status || ''}`.toLowerCase();
            const isExam =
              alternating.category === 'EXAM' ||
              /\b(exam|ct|quiz|term\s*finals?|tf)\b/.test(heroTypeStatus);

            const isLiveNow = relativeLabel === 'Active Now';
            const startMins = timeToMinutes(event.startTime);
            const rawEndMins = timeToMinutes(event.endTime);
            const endMins = rawEndMins > startMins ? rawEndMins : startMins + 50;
            const startMs = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
              Math.floor(startMins / 60),
              startMins % 60,
              0,
              0
            ).getTime();
            const endMs = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
              Math.floor(endMins / 60),
              endMins % 60,
              0,
              0
            ).getTime();
            const liveProgressPercent = isLiveNow
              ? Math.max(
                  0,
                  Math.min(100, ((effectiveNowMs - startMs) / Math.max(60000, endMs - startMs)) * 100)
                )
              : 0;
            const remainingLabel = isLiveNow ? formatRemainingDuration(endMs - effectiveNowMs) : '';

            return (
              <motion.div
                whileTap={{ scale: 0.985 }}
                transition={HERO_TILE_PRESS_SPRING}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectEvent(event);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelectEvent(event);
                  }
                }}
                className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 cursor-pointer transition-[background-color,box-shadow] duration-200 border will-change-transform ${
                  isDark
                    ? 'bg-[#1E1D1C] border-transparent text-stone-100 shadow-[0_2px_6px_rgba(0,0,0,0.28),0_10px_24px_-6px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.04)] hover:bg-[#242321] hover:shadow-[0_3px_8px_rgba(0,0,0,0.34),0_14px_28px_-6px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]'
                    : 'bg-white border-transparent text-stone-900 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_6px_18px_-4px_rgba(28,25,23,0.08)] hover:bg-stone-50/70 hover:shadow-[0_2px_4px_rgba(28,25,23,0.05),0_10px_24px_-6px_rgba(28,25,23,0.11)]'
                }`}
              >
                {/* Top Row: Course Code + Name (left) & Co-Star ROOM Readout (right) */}
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <div
                      className={`text-xl font-bold tracking-tight leading-none ${
                        isDark ? 'text-stone-100' : 'text-stone-900'
                      }`}
                    >
                      {code}
                      {isExam && (
                        <span
                          className={`font-semibold ${
                            isDark ? 'text-neutral-400' : 'text-neutral-500'
                          }`}
                        >
                          {' · Exam'}
                        </span>
                      )}
                    </div>
                    {title && (
                      <div
                        className={`mt-1.5 text-sm font-normal leading-snug ${
                          isDark ? 'text-neutral-400' : 'text-neutral-500'
                        }`}
                      >
                        {title}
                      </div>
                    )}
                  </div>

                  {renderHeroRoomBlock(event.room)}
                </div>

                {/* Bottom Row: Live Status Tracker or High-Contrast Day & Time Range */}
                <div
                  className={`mt-3 pt-2.5 border-t flex items-center justify-between gap-2 ${
                    isDark ? 'border-white/[0.06]' : 'border-black/5'
                  }`}
                >
                  {isLiveNow ? (
                    <>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-[#9E2C2C] animate-pulse shrink-0"
                          aria-hidden="true"
                        />
                        <span className="text-[14px] sm:text-[15px] font-semibold leading-snug text-[#9E2C2C] shrink-0">
                          Happening now
                        </span>
                        <span
                          className={isDark ? 'text-neutral-600' : 'text-neutral-300'}
                          aria-hidden="true"
                        >
                          ·
                        </span>
                        <span
                          className={`text-[14px] sm:text-[15px] font-semibold font-sans tabular-nums leading-snug truncate ${
                            isDark ? 'text-stone-100' : 'text-stone-900'
                          }`}
                        >
                          {remainingLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-xs font-medium font-sans tabular-nums ${
                            isDark ? 'text-neutral-400' : 'text-neutral-500'
                          }`}
                        >
                          until {formatTo12Hour(event.endTime)}
                        </span>
                        {!isExam && alternating.groupVariant && (
                          <span className="text-[11px] font-semibold uppercase tracking-wide shrink-0 text-neutral-400">
                            {alternating.groupVariant}
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <span
                        className={`text-[15px] font-semibold font-sans tabular-nums leading-snug ${
                          isDark ? 'text-stone-100' : 'text-stone-900'
                        }`}
                      >
                        {(() => {
                          const timeRange = `${formatTo12Hour(event.startTime)} – ${formatTo12Hour(event.endTime)}`;
                          if (relativeLabel.startsWith('in ')) {
                            return `Today at ${timeRange} (${relativeLabel})`;
                          }
                          return `${relativeLabel || event.day} at ${timeRange}`;
                        })()}
                      </span>
                      {!isExam && alternating.groupVariant && (
                        <span className="text-[11px] font-semibold uppercase tracking-wide shrink-0 text-neutral-400">
                          {alternating.groupVariant}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Flush 2.5px bottom progress bar when session is currently active */}
                {isLiveNow && (
                  <div
                    aria-hidden="true"
                    className={`absolute inset-x-0 bottom-0 h-[2.5px] pointer-events-none ${
                      isDark ? 'bg-white/[0.08]' : 'bg-black/[0.06]'
                    }`}
                  >
                    <div
                      className={`h-full transition-[width] duration-700 ease-out ${
                        isDark ? 'bg-[#C94A4A]' : 'bg-[#9E2C2C]'
                      }`}
                      style={{ width: `${liveProgressPercent}%` }}
                    />
                  </div>
                )}
              </motion.div>
            );
          })()}

          {/* 2nd and 3rd Upcoming Classes: Compact Rows (Time, Course Code, Room only) */}
          {secondaryItems.length > 0 && (
            <div
              className={`mt-2 divide-y ${
                isDark ? 'divide-stone-800' : 'divide-stone-200'
              }`}
            >
              {secondaryItems.map(({ event, relativeLabel }, index) => {
                const { code } = splitSubject(event.subject);
                const alternating = parseAlternatingSchedule(
                  event.type,
                  event.subject,
                  event.syllabus
                );
                const typeStatusCombined = `${event.type || ''} ${event.status || ''}`.toLowerCase();
                const isExamRow =
                  alternating.category === 'EXAM' ||
                  /\b(exam|ct|quiz|term\s*finals?|tf)\b/.test(typeStatusCombined);

                return (
                  <div
                    key={event.id || `${event.day}-${event.startTime}-${index}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent(event);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        onSelectEvent(event);
                      }
                    }}
                    className={`py-2.5 px-2 flex items-center justify-between gap-3 cursor-pointer rounded-lg transition-all duration-150 ease-out active:scale-[0.98] ${
                      isDark ? 'hover:bg-[#1C1A18]' : 'hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`text-xs font-medium font-sans tabular-nums shrink-0 ${
                          isDark ? 'text-stone-400' : 'text-stone-500'
                        }`}
                      >
                        {formatInlineDayTime(event, relativeLabel, false)}
                      </span>
                      <span
                        className={`text-xs sm:text-sm font-semibold tracking-normal truncate ${
                          isDark ? 'text-stone-100' : 'text-stone-900'
                        }`}
                      >
                        {code}
                        {isExamRow && (
                          <span
                            className={`font-semibold ${
                              isDark ? 'text-stone-300' : 'text-stone-600'
                            }`}
                          >
                            {' • Exam'}
                          </span>
                        )}
                      </span>
                    </div>

                    <span
                      className={`text-xs font-sans tabular-nums shrink-0 ${
                        isDark ? 'text-stone-400' : 'text-stone-500'
                      }`}
                    >
                      {event.room || 'TBA'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
