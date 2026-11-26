import React from 'react';
import { RoutineEvent } from '../types/routine';
import { SlotCard } from './SlotCard';
import { getAcademicPeriodMarkers, PeriodMarker, formatTo12Hour } from '../utils/timeCalculations';
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
        className={`rounded-[20px] overflow-hidden shadow-2xs flex items-stretch select-none border transition-colors ${
          isDark
            ? 'bg-[#11100F] border-stone-800'
            : 'bg-stone-100 border-stone-200'
        }`}
      >
      {/* 1. RIGID STATIC LEFT CONTAINER: Precision Day Track Column */}
      <div
        className={`w-24 sm:w-32 shrink-0 flex flex-col z-20 border-r transition-colors ${
          isDark
            ? 'border-stone-800 bg-[#141312]'
            : 'border-stone-200 bg-[#FAF9F6]'
        }`}
      >
        {/* Static Header Axis Box (h-10) */}
        <div
          className={`h-10 px-3 flex items-center justify-center text-center text-xs font-bold tracking-tight border-b transition-colors ${
            isDark
              ? 'border-stone-800 bg-[#1C1A18] text-stone-100'
              : 'border-stone-200 bg-stone-100 text-stone-900'
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
              className={`h-24 p-2 flex items-center justify-center transition-colors border-b last:border-b-0 ${
                isDark
                  ? `border-stone-800 ${isToday ? 'bg-[#1C1A18]' : 'bg-[#141312]'}`
                  : `border-stone-200 ${isToday ? 'bg-stone-100' : 'bg-[#FAF9F6]'}`
              }`}
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

      {/* 2. TIMELINE TRACK CONTAINER (SCROLLS HORIZONTALLY, WITH EXACT 1PX HAIRLINE MATRIX) */}
      <div className="relative flex-1 min-w-0 overflow-hidden flex flex-col">
        <div
          ref={scrollRef}
          className={`flex-1 overflow-x-auto scroll-smooth timeline-touch-track transition-colors shadow-inner ${
            isDark ? 'bg-[#11100F]' : 'bg-stone-100'
          }`}
          style={{
            touchAction: 'pan-x pan-y',
            WebkitOverflowScrolling: 'touch',
            maskImage: TIMELINE_EDGE_FADE_MASK,
            WebkitMaskImage: TIMELINE_EDGE_FADE_MASK,
          }}
        >
          <div className="min-w-[1008px] flex flex-col">
          {/* Top Academic Period Start-Time Axis Track (h-10) with symmetric px-6 buffer & exact vertical alignment */}
          <div
            className={`h-10 px-6 flex items-center select-none border-b transition-colors ${
              isDark
                ? 'border-stone-800 bg-[#1C1A18]'
                : 'border-stone-200 bg-stone-100'
            }`}
          >
            <div className="relative w-full h-full flex items-center">
              {periodMarkers.map((marker) => {
                return (
                  <React.Fragment key={marker.timeStr}>
                    {/* Exact hairline tick sitting directly on leftPercent line */}
                    <div
                      style={{ left: `${marker.leftPercent}%` }}
                      className={`absolute bottom-0 h-2 w-px border-l pointer-events-none ${
                        isDark ? 'border-stone-700' : 'border-stone-300'
                      }`}
                    />
                    {/* Vertically and horizontally centered label directly over marker tick */}
                    <div
                      style={{ left: `${marker.leftPercent}%` }}
                      className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center text-[10px] font-sans font-medium whitespace-nowrap tabular-nums leading-none pointer-events-none ${
                        isDark ? 'text-stone-300' : 'text-stone-600'
                      }`}
                    >
                      {formatTo12Hour(marker.timeStr)}
                    </div>
                  </React.Fragment>
                );
              })}

              {/* Live Operational Time Marker */}
              {currentMinuteOffset !== null &&
                currentMinuteOffset >= 0 &&
                currentMinuteOffset <= 540 && (
                  <div
                    style={{ left: `${(currentMinuteOffset / 540) * 100}%` }}
                    className="absolute top-0 bottom-0 -translate-x-1/2 flex flex-col items-center pointer-events-none z-30"
                  >
                    <div
                      className={`px-1.5 py-0.5 rounded-2xs text-[9px] font-sans font-semibold tracking-normal shadow-xs uppercase border ${
                        isDark
                          ? 'bg-emerald-500 text-white border-emerald-400'
                          : 'bg-stone-900 text-stone-50 border-stone-800'
                      }`}
                    >
                      Now
                    </div>
                    <div
                      className={`w-0.5 h-full ${
                        isDark ? 'bg-emerald-500' : 'bg-stone-900'
                      }`}
                    />
                  </div>
                )}
            </div>
          </div>

          {/* Synchronized Day Tracks with symmetric px-6 buffer & Exact 1px Hairlines */}
          {days.map((day) => {
            const isToday = day.toLowerCase() === todayName.toLowerCase();
            const dayEvents = events.filter(
              (e) => e.day.toLowerCase() === day.toLowerCase()
            );

            return (
              <div
                key={`track-${day}`}
                className={`h-24 px-6 py-1 transition-colors border-b last:border-b-0 ${
                  isDark
                    ? `border-stone-800/80 ${isToday ? 'bg-stone-100/[0.03]' : 'bg-transparent'}`
                    : `border-stone-200 ${isToday ? 'bg-stone-200/45' : 'bg-transparent'}`
                }`}
              >
                <div className="relative w-full h-full">
                  {/* Subtle vertical column gridlines aligned identically to header markers */}
                  <div className="absolute -top-1 -bottom-1 left-0 right-0 pointer-events-none" aria-hidden="true">
                    {periodMarkers.map((marker) => (
                      <div
                        key={`gridline-${day}-${marker.timeStr}`}
                        style={{ left: `${marker.leftPercent}%` }}
                        className={`absolute top-0 bottom-0 w-px border-l ${
                          isDark ? 'border-stone-800/70' : 'border-stone-300/45'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Live Current Time Vertical Line for Today */}
                  {isToday &&
                    currentMinuteOffset !== null &&
                    currentMinuteOffset >= 0 &&
                    currentMinuteOffset <= 540 && (
                      <div
                        style={{ left: `${(currentMinuteOffset / 540) * 100}%` }}
                        className={`absolute -top-1 -bottom-1 -translate-x-1/2 w-0.5 z-20 pointer-events-none ${
                          isDark ? 'bg-emerald-500 opacity-90' : 'bg-stone-900 opacity-85'
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
