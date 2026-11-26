import React from 'react';
import { RoutineEvent } from '../types/routine';
import { SlotCard } from './SlotCard';
import {
  DAY_START_MINUTES,
  getAcademicPeriodMarkers,
  PeriodMarker,
  formatTo12Hour,
  formatMinutesTo12Hour,
} from '../utils/timeCalculations';
import { parseAlternatingSchedule } from '../utils/alternatingLabEngine';

interface MasterTimelineGridProps {
  days: Array<'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday'>;
  events: RoutineEvent[];
  todayName: string;
  currentMinuteOffset: number | null;
  onSelectEvent: (event: RoutineEvent) => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  theme?: 'light' | 'dark';
  selectedGroup?: 'All' | 'Group A' | 'Group B';
  highlightedEventKey?: string | null;
}

const TIMELINE_EDGE_FADE_MASK =
  'linear-gradient(to right, transparent 0px, rgba(0,0,0,0.12) 4px, rgba(0,0,0,0.45) 9px, rgba(0,0,0,0.82) 14px, black 18px, black calc(100% - 28px), rgba(0,0,0,0.9) calc(100% - 24px), rgba(0,0,0,0.62) calc(100% - 18px), rgba(0,0,0,0.28) calc(100% - 11px), rgba(0,0,0,0.08) calc(100% - 5px), transparent 100%)';

export const MasterTimelineGrid: React.FC<MasterTimelineGridProps> = ({
  days,
  events,
  todayName,
  currentMinuteOffset,
  onSelectEvent,
  scrollRef,
  theme = 'light',
  selectedGroup = 'All',
  highlightedEventKey = null,
}) => {
  const periodMarkers: PeriodMarker[] = getAcademicPeriodMarkers();
  const isDark = theme === 'dark';

  return (
    <div className="flex flex-col">
      <div
        className={`rounded-2xl overflow-hidden shadow-2xs flex items-stretch select-none border transition-colors ${
          isDark
            ? 'bg-[#141414] border-stone-800'
            : 'bg-[#F4F3EF] border-stone-200'
        }`}
      >
      {/* 1. RIGID STATIC LEFT CONTAINER: Precision Day Track Column (borderless, tucked via pr-2) */}
      <div
        className={`w-24 sm:w-32 shrink-0 flex flex-col z-20 pr-2 transition-colors ${
          isDark ? 'bg-[#141414]' : 'bg-[#F4F3EF]'
        }`}
      >
        {/* Static Header Axis Box (h-11) */}
        <div
          className={`h-11 pl-2 -mr-2 pr-2 flex items-center justify-center text-center text-xs font-bold tracking-tight leading-none border-b transition-colors ${
            isDark
              ? 'border-white/[0.05] bg-[#141414] text-stone-100'
              : 'border-black/[0.05] bg-[#F4F3EF] text-stone-900'
          }`}
        >
          <span>Day</span>
        </div>

        {/* Static Day Rows with Centered Gate Identifier Style (h-24) */}
        {days.map((day) => {
          const isToday = day.toLowerCase() === todayName.toLowerCase();
          const dayEventsCount = events.filter((e) => {
            if (e.day.toLowerCase() !== day.toLowerCase()) return false;
            const status = (e.status || '').trim().toLowerCase();
            return status !== 'cancelled' && status !== 'canceled';
          }).length;

          return (
            <div
              key={`static-${day}`}
              className="h-24 py-2 pl-2 flex items-center justify-center bg-transparent transition-colors"
            >
              {/* Centered Day Identifier Card */}
              <div
                className={`w-full h-full rounded-xl p-2 flex flex-col items-center justify-center text-center transition-all border ${
                  isToday
                    ? isDark
                      ? 'bg-stone-100 border-stone-100 text-stone-900 shadow-xs'
                      : 'bg-stone-900 border-stone-900 text-stone-50 shadow-xs'
                    : isDark
                    ? 'bg-[#1C1A18] border-stone-800 text-stone-100 hover:border-stone-700'
                    : 'bg-white border-stone-200 text-stone-900 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center justify-center leading-none">
                  <span className="text-base font-bold tracking-tight">
                    {day.slice(0, 3)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-center gap-1 text-[10px] tracking-normal opacity-85 leading-none">
                  <span>{dayEventsCount} {dayEventsCount === 1 ? 'class' : 'classes'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. TIMELINE TRACK CONTAINER (SCROLLS HORIZONTALLY, WITH FLOATING VERTICAL TIME GUIDES) */}
      <div className="relative flex-1 min-w-0 overflow-hidden flex flex-col">
        <div
          ref={scrollRef}
          className={`flex-1 overflow-x-auto scroll-smooth timeline-touch-track transition-colors ${
            isDark ? 'bg-[#141414]' : 'bg-[#F4F3EF]'
          }`}
          style={{
            touchAction: 'pan-x pan-y',
            WebkitOverflowScrolling: 'touch',
            maskImage: TIMELINE_EDGE_FADE_MASK,
            WebkitMaskImage: TIMELINE_EDGE_FADE_MASK,
          }}
        >
          <div className="relative min-w-[1008px] flex flex-col">
          {/* Floating vertical time-column guides behind class rows (below header & inset from bottom) */}
          <div
            className="absolute top-12 bottom-3 left-6 right-6 pointer-events-none z-0"
            aria-hidden="true"
          >
            {periodMarkers.map((marker) => (
              <div
                key={`gridline-${marker.timeStr}`}
                style={{ left: `${marker.leftPercent}%` }}
                className={`absolute top-0 bottom-0 w-px border-l ${
                  isDark ? 'border-white/[0.05]' : 'border-black/[0.05]'
                }`}
              />
            ))}
          </div>

          {/* Top Academic Period Start-Time Axis Track (h-11) with symmetric px-6 buffer */}
          <div
            className={`relative z-10 h-11 px-6 flex items-center select-none border-b transition-colors ${
              isDark
                ? 'border-white/[0.05] bg-[#141414]'
                : 'border-black/[0.05] bg-[#F4F3EF]'
            }`}
          >
            <div className="relative w-full h-full flex items-center">
              {periodMarkers.map((marker) => {
                return (
                  <div
                    key={marker.timeStr}
                    style={{ left: `${marker.leftPercent}%` }}
                    className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 flex items-center text-[10px] font-sans font-medium whitespace-nowrap tabular-nums leading-none pointer-events-none ${
                      isDark ? 'text-stone-400' : 'text-stone-500'
                    }`}
                  >
                    {formatTo12Hour(marker.timeStr)}
                  </div>
                );
              })}

              {/* Inline Live Current-Time Crimson Pill centered vertically over timestamps */}
              {currentMinuteOffset !== null &&
                currentMinuteOffset >= 0 &&
                currentMinuteOffset <= 540 && (
                  <>
                    {/* 1.5px vertical stem extending downward from bottom center of pill */}
                    <div
                      style={{ left: `${(currentMinuteOffset / 540) * 100}%` }}
                      className={`absolute top-1/2 bottom-0 -translate-x-1/2 w-[1.5px] z-10 pointer-events-none ${
                        isDark ? 'bg-[#C84B4D]' : 'bg-[#9E2A2B]'
                      }`}
                    />
                    <div
                      style={{ left: `${(currentMinuteOffset / 540) * 100}%` }}
                      className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 rounded-full px-2.5 py-0.5 text-[11px] font-sans font-semibold tabular-nums whitespace-nowrap leading-none shadow-sm ring-2 pointer-events-none ${
                        isDark
                          ? 'bg-[#C84B4D] text-white ring-[#141414]'
                          : 'bg-[#9E2A2B] text-white ring-[#F4F3EF]'
                      }`}
                    >
                      {formatMinutesTo12Hour(DAY_START_MINUTES + currentMinuteOffset)}
                    </div>
                  </>
                )}
            </div>
          </div>

          {/* Synchronized Day Tracks with symmetric px-6 buffer */}
          {days.map((day) => {
            const isToday = day.toLowerCase() === todayName.toLowerCase();
            const dayEvents = events.filter(
              (e) => e.day.toLowerCase() === day.toLowerCase()
            );

            return (
              <div
                key={`track-${day}`}
                className="relative z-10 h-24 px-6 py-1 bg-transparent transition-colors"
              >
                <div className="relative w-full h-full">
                  {/* Live Current Time Vertical Line for Today (always pinned above cards) */}
                  {isToday &&
                    currentMinuteOffset !== null &&
                    currentMinuteOffset >= 0 &&
                    currentMinuteOffset <= 540 && (
                      <div
                        style={{ left: `${(currentMinuteOffset / 540) * 100}%` }}
                        className={`absolute -top-1 -bottom-1 -translate-x-1/2 w-[1.5px] z-30 pointer-events-none ${
                          isDark ? 'bg-[#C84B4D] opacity-90' : 'bg-[#9E2A2B] opacity-85'
                        }`}
                      />
                    )}

                  {/* Scheduled Flight / Class Slots */}
                  <div className="relative w-full h-full">
                    {dayEvents.length === 0 ? (
                      <div
                        className={`h-full flex items-center justify-center text-xs font-sans ${
                          isDark ? 'text-stone-500' : 'text-stone-400'
                        }`}
                      >
                        No classes scheduled for {day}
                      </div>
                    ) : (
                      dayEvents.map((evt, idx) => {
                        const meta = parseAlternatingSchedule(evt.type, evt.subject, evt.syllabus);
                        const isDimmed =
                          (selectedGroup === 'Group A' && meta.groupVariant === 'B') ||
                          (selectedGroup === 'Group B' && meta.groupVariant === 'A');
                        const eventKey = evt.id || `${day}-${evt.startTime}-${idx}`;
                        const isHighlighted = highlightedEventKey === eventKey;

                        return (
                          <SlotCard
                            key={eventKey}
                            event={evt}
                            onSelect={onSelectEvent}
                            theme={theme}
                            isDimmed={isDimmed}
                            isHighlighted={isHighlighted}
                          />
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  </div>
</div>
);
};
