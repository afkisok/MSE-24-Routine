import React from 'react';
import { RoutineEvent } from '../types/routine';
import { timeToMinutes, formatTo12Hour } from '../utils/timeCalculations';
import { parseAlternatingSchedule } from '../utils/alternatingLabEngine';
import { Calendar } from 'lucide-react';

interface AtAGlanceWidgetProps {
  events: RoutineEvent[];
  onSelectEvent: (event: RoutineEvent) => void;
  theme?: 'light' | 'dark';
  selectedGroup?: 'All' | 'Group A' | 'Group B';
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

  return (
    <div
      className={`rounded-[20px] p-4 mb-4 select-none border transition-colors ${
        isDark
          ? 'bg-[#18181B] border-[#27272A]'
          : 'bg-white border-[#E2E8F0]'
      }`}
    >
      {/* Upcoming Classes Header */}
      <div
        className={`flex items-center justify-between pb-2.5 mb-2 border-b transition-colors ${
          isDark ? 'border-[#27272A]' : 'border-[#E2E8F0]'
        }`}
      >
        <div className="flex items-center gap-2">
          <Calendar className={`w-3.5 h-3.5 ${isDark ? 'text-[#A1A1AA]' : 'text-slate-500'}`} />
          <h2
            className={`text-xs font-semibold tracking-normal uppercase font-sans ${
              isDark ? 'text-[#F4F4F5]' : 'text-[#0F172A]'
            }`}
          >
            Upcoming Classes
          </h2>
        </div>
        <span
          className={`text-[11px] font-sans ${
            isDark ? 'text-[#A1A1AA]' : 'text-slate-500'
          }`}
        >
          Next 3 sessions
        </span>
      </div>

      {/* Flattened Compact Tabular List */}
      <div>
        {upcomingList.length === 0 ? (
          <div
            className={`py-5 text-center text-xs font-sans ${
              isDark ? 'text-[#A1A1AA]' : 'text-slate-500'
            }`}
          >
            No upcoming classes in queue
          </div>
        ) : (
          upcomingList.map(({ event, relativeLabel }, index) => {
            const alternating = parseAlternatingSchedule(event.type, event.subject, event.syllabus);
            const isExam = alternating.category === 'EXAM';
            const teacherShort = event.teacher ? event.teacher.split('(')[0].trim() : '';

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
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelectEvent(event);
                  }
                }}
                className={`py-2.5 px-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer transition-transform duration-150 active:scale-[0.98] border-b last:border-b-0 ${
                  isDark
                    ? 'border-[#27272A] hover:bg-[#27272A]/50'
                    : 'border-slate-100 hover:bg-slate-50/80'
                }`}
              >
                {/* Course code/title in bold, with room and teacher in muted gray text */}
                <div className="min-w-0 flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs sm:text-sm font-semibold tracking-normal truncate ${
                      isDark ? 'text-[#F4F4F5]' : 'text-[#0F172A]'
                    }`}
                  >
                    {event.subject}
                  </span>

                  {isExam && (
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                        isDark
                          ? 'bg-amber-950/60 text-amber-300 border-amber-800/70'
                          : 'bg-amber-100 text-amber-800 border-amber-200'
                      }`}
                    >
                      Exam / CT
                    </span>
                  )}

                  {alternating.groupTag && (
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full border uppercase ${
                        isDark
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/70'
                          : 'bg-emerald-100 text-[#064E3B] border-emerald-300'
                      }`}
                    >
                      {alternating.groupTag}
                    </span>
                  )}

                  <span
                    className={`text-xs font-sans tabular-nums ${
                      isDark ? 'text-[#A1A1AA]' : 'text-slate-500'
                    }`}
                  >
                    · Room {event.room || 'TBA'}{teacherShort ? ` · ${teacherShort}` : ''}
                  </span>
                </div>

                {/* Clean, unified single-status timestamp display */}
                <div className="flex items-center gap-2 shrink-0 font-sans tabular-nums text-xs">
                  {relativeLabel && (
                    <span
                      className={`text-[10px] font-sans font-medium px-2 py-0.5 rounded-full border ${
                        relativeLabel === 'Active Now'
                          ? isDark
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : relativeLabel.startsWith('in ')
                          ? isDark
                            ? 'bg-amber-950/70 text-amber-300 border-amber-800'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                          : isDark
                          ? 'bg-[#27272A] text-slate-300 border-[#3F3F46]'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {relativeLabel}
                    </span>
                  )}
                  <span
                    className={`tabular-nums font-semibold ${
                      isDark ? 'text-[#FAFAFA]' : 'text-slate-800'
                    }`}
                  >
                    {event.day.slice(0, 3)} · {formatTo12Hour(event.startTime)} – {formatTo12Hour(event.endTime)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
