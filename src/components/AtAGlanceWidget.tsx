import React from 'react';
import { RoutineEvent } from '../types/routine';
import { timeToMinutes, formatTo12Hour } from '../utils/timeCalculations';
import { parseAlternatingSchedule } from '../utils/alternatingLabEngine';

interface AtAGlanceWidgetProps {
  events: RoutineEvent[];
  onSelectEvent: (event: RoutineEvent) => void;
  theme?: 'light' | 'dark';
  selectedGroup?: 'All' | 'Group A' | 'Group B';
  assignmentsCount?: number;
  onOpenAssignments?: () => void;
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
}) => {
  const isDark = theme === 'dark';
  const now = new Date();
  const todayDayNum = now.getDay();
  const currentMins = now.getHours() * 60 + now.getMinutes();

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
      const evtEndMins = timeToMinutes(evt.endTime);

      let dayDiff = (targetDayNum - todayDayNum + 7) % 7;

      // If scheduled for today but already finished, push to next week
      if (dayDiff === 0 && currentMins > evtEndMins) {
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
    const dayPrefix = relativeLabel || event.day;
    const start = formatTo12Hour(event.startTime);
    if (includeEnd) {
      return `${dayPrefix}, ${start} – ${formatTo12Hour(event.endTime)}`;
    }
    return `${dayPrefix}, ${start}`;
  };

  const heroItem = upcomingList[0] || null;
  const secondaryItems = upcomingList.slice(1);

  return (
    <section className="mb-6 select-none">
      {/* Upcoming Classes Header directly on page background */}
      <div className="flex items-center justify-between gap-2 mb-3 px-1">
        <h2
          className={`text-xs font-semibold tracking-normal uppercase font-sans ${
            isDark ? 'text-white' : 'text-[#0F172A]'
          }`}
        >
          Upcoming Classes
        </h2>

        {onOpenAssignments && (
          <button
            type="button"
            onClick={onOpenAssignments}
            className={`relative px-3 py-1 rounded-full text-xs font-medium inline-flex items-center border transition-all duration-150 active:scale-95 cursor-pointer select-none ${
              isDark
                ? 'bg-[#18181B] border-neutral-800 text-[#F4F4F5] hover:bg-[#27272A] hover:border-neutral-700'
                : 'bg-white border-slate-300 text-[#0F172A] hover:bg-slate-50 hover:border-slate-400'
            }`}
          >
            {assignmentsCount > 0 && (
              <span
                className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-purple-500 ring-2 pointer-events-none ${
                  isDark ? 'ring-[#121212]' : 'ring-white'
                }`}
                aria-hidden="true"
              />
            )}
            <span>Assignments</span>
          </button>
        )}
      </div>

      {upcomingList.length === 0 ? (
        <div
          className={`py-5 text-center text-xs font-sans ${
            isDark ? 'text-[#A1A1AA]' : 'text-slate-500'
          }`}
        >
          No upcoming classes in queue
        </div>
      ) : (
        <div className="flex flex-col">
          {/* 1st (Closest) Upcoming Class: Clean Elevated White Hero Card */}
          {heroItem && (() => {
            const { event, relativeLabel } = heroItem;
            const { code, title } = splitSubject(event.subject);
            const alternating = parseAlternatingSchedule(event.type, event.subject, event.syllabus);
            const isExam = alternating.category === 'EXAM';

            return (
              <div
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
                className={`rounded-2xl p-4 sm:p-5 cursor-pointer transition-all duration-150 ease-out active:scale-[0.98] border-[1.5px] shadow-sm ${
                  isDark
                    ? 'bg-[#121212] border-white/15 text-white hover:border-white/25'
                    : 'bg-white border-slate-300 text-[#0F172A] hover:border-slate-400'
                }`}
              >
                {/* Flat inline day & time row */}
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <span
                    className={`text-sm sm:text-base font-semibold font-sans tabular-nums ${
                      relativeLabel === 'Active Now'
                        ? isDark
                          ? 'text-emerald-400'
                          : 'text-emerald-700'
                        : isExam
                        ? isDark
                          ? 'text-amber-300'
                          : 'text-amber-700'
                        : isDark
                        ? 'text-slate-300'
                        : 'text-slate-600'
                    }`}
                  >
                    {formatInlineDayTime(event, relativeLabel, true)}
                  </span>
                  {(isExam || alternating.groupTag) && (
                    <span
                      className={`text-[11px] font-semibold uppercase tracking-wide ${
                        isExam
                          ? isDark
                            ? 'text-amber-300'
                            : 'text-amber-700'
                          : isDark
                          ? 'text-emerald-400'
                          : 'text-[#064E3B]'
                      }`}
                    >
                      {isExam ? 'Exam / CT' : alternating.groupTag}
                    </span>
                  )}
                </div>

                {/* Large Course Code & Title */}
                <div
                  className={`text-xl sm:text-2xl font-bold tracking-tight leading-tight ${
                    isDark ? 'text-white' : 'text-[#0F172A]'
                  }`}
                >
                  {code}
                </div>
                {title && (
                  <div
                    className={`mt-1 text-sm sm:text-base font-medium leading-snug ${
                      isDark ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    {title}
                  </div>
                )}

                {/* Prominent Room */}
                <div
                  className={`mt-3 pt-2.5 border-t flex items-center justify-between text-sm font-semibold tabular-nums ${
                    isDark
                      ? 'border-neutral-800 text-slate-200'
                      : 'border-slate-200 text-slate-700'
                  }`}
                >
                  <span>Room {event.room || 'TBA'}</span>
                </div>
              </div>
            );
          })()}

          {/* 2nd and 3rd Upcoming Classes: Compact Rows (Time, Course Code, Room only) */}
          {secondaryItems.length > 0 && (
            <div
              className={`mt-2 divide-y ${
                isDark ? 'divide-[#27272A]' : 'divide-slate-200'
              }`}
            >
              {secondaryItems.map(({ event, relativeLabel }, index) => {
                const { code } = splitSubject(event.subject);

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
                      isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`text-xs font-medium font-sans tabular-nums shrink-0 ${
                          isDark ? 'text-[#A1A1AA]' : 'text-slate-500'
                        }`}
                      >
                        {formatInlineDayTime(event, relativeLabel, false)}
                      </span>
                      <span
                        className={`text-xs sm:text-sm font-semibold tracking-normal truncate ${
                          isDark ? 'text-[#F4F4F5]' : 'text-[#0F172A]'
                        }`}
                      >
                        {code}
                      </span>
                    </div>

                    <span
                      className={`text-xs font-sans tabular-nums shrink-0 ${
                        isDark ? 'text-[#A1A1AA]' : 'text-slate-500'
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
    </section>
  );
};
