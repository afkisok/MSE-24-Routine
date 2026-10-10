import React, { useState, useEffect } from 'react';
import { RoutineEvent } from '../types/routine';
import { SlotCard } from './SlotCard';
import { getAcademicPeriodMarkers, PeriodMarker, formatTo12Hour } from '../utils/timeCalculations';
import { parseAlternatingSchedule } from '../utils/alternatingLabEngine';
import { Compass, MoveHorizontal } from 'lucide-react';

interface MasterTimelineGridProps {
  days: Array<'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday'>;
  events: RoutineEvent[];
  todayName: string;
  currentMinuteOffset: number | null;
  onSelectEvent: (event: RoutineEvent) => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  theme?: 'light' | 'dark';
  selectedGroup?: 'All' | 'Group A' | 'Group B';
}

export const MasterTimelineGrid: React.FC<MasterTimelineGridProps> = ({
  days,
  events,
  todayName,
  currentMinuteOffset,
  onSelectEvent,
  scrollRef,
  theme = 'light',
  selectedGroup = 'All',
}) => {
  const periodMarkers: PeriodMarker[] = getAcademicPeriodMarkers();
  const isDark = theme === 'dark';

  // Dynamic right-edge gradient opacity tracking
  const [scrollProgressRatio, setScrollProgressRatio] = useState<number>(0);

  useEffect(() => {
    const container = scrollRef?.current;
    if (!container) return;

    const updateScrollMetrics = () => {
      const maxScroll = container.scrollWidth - container.clientWidth;
      if (maxScroll <= 4) {
        setScrollProgressRatio(1); // fully scrolled or not scrollable
        return;
      }
      const ratio = container.scrollLeft / maxScroll;
      setScrollProgressRatio(Math.min(1, Math.max(0, ratio)));
    };

    updateScrollMetrics();
    container.addEventListener('scroll', updateScrollMetrics, { passive: true });
    window.addEventListener('resize', updateScrollMetrics);

    return () => {
      container.removeEventListener('scroll', updateScrollMetrics);
      window.removeEventListener('resize', updateScrollMetrics);
    };
  }, [scrollRef]);

  // Fade out as the user approaches the end (0 when fully scrolled, 1 when at beginning)
  const rightGradientOpacity = Math.max(0, 1 - scrollProgressRatio);

  return (
    <div className="flex flex-col">
      {/* Mobile / Tablet Horizontal Scroll Affordance Hint */}
      <div
        className={`md:hidden mb-2 px-3 py-1.5 rounded-full flex items-center justify-between text-[11px] font-sans border transition-colors ${
          isDark
            ? 'bg-[#18181B] border-[#27272A] text-[#A1A1AA]'
            : 'bg-slate-50 border-slate-200 text-slate-600'
        }`}
      >
        <span className="flex items-center gap-1.5">
          <MoveHorizontal className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
          <span>Swipe horizontally to view full day schedule (08:00 – 17:00)</span>
        </span>
        <span className="font-sans text-[10px] font-medium">9 Periods</span>
      </div>

      <div
        className={`rounded-[20px] overflow-hidden shadow-2xs flex items-stretch select-none border transition-colors ${
          isDark
            ? 'bg-[#0F172A] border-[#334155]'
            : 'bg-white border-[#E2E8F0]'
        }`}
      >
      {/* 1. RIGID STATIC LEFT CONTAINER: Precision Day Track Column */}
      <div
        className={`w-24 sm:w-32 shrink-0 flex flex-col z-20 border-r transition-colors ${
          isDark
            ? 'border-[#334155] bg-[#0B1120]'
            : 'border-[#E2E8F0] bg-slate-50/70'
        }`}
      >
        {/* Static Header Axis Box (h-10) */}
        <div
          className={`h-10 px-3 flex items-center justify-between text-xs font-bold tracking-tight border-b transition-colors ${
            isDark
              ? 'border-[#334155] bg-[#131D31] text-white'
              : 'border-[#E2E8F0] bg-slate-100/80 text-[#0F172A]'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Compass className={`w-3.5 h-3.5 ${isDark ? 'text-white' : 'text-[#0F172A]'}`} />
            <span>Day</span>
          </span>
          <span className={`text-[11px] font-normal hidden sm:inline ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Classes
          </span>
        </div>

        {/* Static Day Rows with Centered Gate Identifier Style (h-24) */}
        {days.map((day) => {
          const isToday = day.toLowerCase() === todayName.toLowerCase();
          const dayEventsCount = events.filter(
            (e) => e.day.toLowerCase() === day.toLowerCase()
          ).length;

          return (
            <div
              key={`static-${day}`}
              className={`h-24 p-2 flex items-center justify-center transition-colors border-b last:border-b-0 ${
                isDark
                  ? `border-[#334155] ${isToday ? 'bg-[#131D31]' : 'bg-[#0B1120]'}`
                  : `border-[#E2E8F0] ${isToday ? 'bg-slate-100/90' : 'bg-slate-50/40'}`
              }`}
            >
              {/* Centered Day Identifier Card */}
              <div
                className={`w-full h-full rounded-xl p-2 flex flex-col items-center justify-center text-center transition-all border ${
                  isToday
                    ? isDark
                      ? 'bg-[#1E293B] border-emerald-500 text-white shadow-xs'
                      : 'bg-[#0F172A] border-[#0F172A] text-white shadow-xs'
                    : isDark
                    ? 'bg-[#131D31] border-[#334155] text-white hover:border-slate-500'
                    : 'bg-white border-[#E2E8F0] text-[#0F172A] hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5 leading-none">
                  <span className="text-base font-bold tracking-tight">
                    {day.slice(0, 3)}
                  </span>
                  {isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  )}
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
          className={`flex-1 overflow-x-auto scroll-smooth timeline-touch-track transition-colors ${
            isDark ? 'bg-[#0F172A]' : 'bg-white'
          }`}
          style={{
            touchAction: 'pan-x pan-y',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div className="min-w-[960px] flex flex-col">
          {/* Top Academic Period Start-Time Axis Track (h-10) with exact vertical alignment */}
          <div
            className={`h-10 relative select-none border-b transition-colors ${
              isDark
                ? 'border-[#334155] bg-[#131D31]'
                : 'border-[#E2E8F0] bg-slate-100/70'
            }`}
          >
            {periodMarkers.map((marker) => {
              return (
                <React.Fragment key={marker.timeStr}>
                  {/* Exact hairline tick sitting directly on leftPercent line */}
                  <div
                    style={{ left: `${marker.leftPercent}%` }}
                    className={`absolute bottom-0 h-2.5 w-px border-l pointer-events-none ${
                      isDark ? 'border-[#334155]' : 'border-slate-300'
                    }`}
                  />
                  {/* Centered label matching marker tick */}
                  <div
                    style={{ left: `${marker.leftPercent}%` }}
                    className={`absolute top-1 text-[10px] font-sans font-medium whitespace-nowrap tabular-nums pointer-events-none ${
                      marker.isFirst
                        ? 'translate-x-0 pl-1'
                        : marker.isLast
                        ? '-translate-x-full pr-1'
                        : '-translate-x-1/2'
                    } ${isDark ? 'text-slate-300' : 'text-slate-600'}`}
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
                        : 'bg-[#0F172A] text-white border-slate-700'
                    }`}
                  >
                    Now
                  </div>
                  <div
                    className={`w-0.5 h-full ${
                      isDark ? 'bg-emerald-500' : 'bg-[#0F172A]'
                    }`}
                  />
                </div>
              )}
          </div>

          {/* Synchronized Day Tracks with Exact 1px Hairlines (#E2E8F0 in light, #334155 in dark) */}
          {days.map((day) => {
            const isToday = day.toLowerCase() === todayName.toLowerCase();
            const dayEvents = events.filter(
              (e) => e.day.toLowerCase() === day.toLowerCase()
            );

            return (
              <div
                key={`track-${day}`}
                className={`h-24 relative py-1 transition-colors border-b last:border-b-0 ${
                  isDark
                    ? `border-[#334155] ${isToday ? 'bg-[#131D31]/40' : 'bg-[#0F172A]'}`
                    : `border-[#E2E8F0] ${isToday ? 'bg-slate-50/50' : 'bg-white'}`
                }`}
              >
                {/* 1PX SOLID STEEL MATRIX GRIDLINES (#334155 dark / #E2E8F0 light) */}
                <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                  {periodMarkers.map((marker) => (
                    <div
                      key={`gridline-${day}-${marker.timeStr}`}
                      style={{ left: `${marker.leftPercent}%` }}
                      className={`absolute top-0 bottom-0 w-px border-l ${
                        isDark ? 'border-[#334155]' : 'border-[#E2E8F0]'
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
                      className={`absolute top-0 bottom-0 -translate-x-1/2 w-0.5 z-20 pointer-events-none ${
                        isDark ? 'bg-emerald-500 opacity-90' : 'bg-[#0F172A] opacity-85'
                      }`}
                    />
                  )}

                {/* Scheduled Flight / Class Slots */}
                <div className="relative w-full h-full">
                  {dayEvents.length === 0 ? (
                    <div
                      className={`h-full flex items-center justify-center text-xs font-sans ${
                        isDark ? 'text-slate-500' : 'text-slate-400'
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

                      return (
                        <SlotCard
                          key={evt.id || `${day}-${evt.startTime}-${idx}`}
                          event={evt}
                          onSelect={onSelectEvent}
                          theme={theme}
                          isDimmed={isDimmed}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic Right-Edge Gradient Overlay (fades out as user scrolls toward the end) */}
      <div
        className={`absolute top-0 bottom-0 right-0 w-8 sm:w-12 pointer-events-none transition-opacity duration-150 z-30 ${
          isDark
            ? 'bg-gradient-to-l from-[#0F172A] to-transparent'
            : 'bg-gradient-to-l from-white to-transparent'
        }`}
        style={{
          opacity: rightGradientOpacity,
        }}
        aria-hidden="true"
      />
    </div>
  </div>
</div>
);
};
