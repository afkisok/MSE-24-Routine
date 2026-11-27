import React, { useEffect, useRef, useState } from 'react';
import { RoutineEvent } from '../types/routine';
import { SlotCard } from './SlotCard';
import {
  DAY_START_MINUTES,
  TOTAL_DAY_MINUTES,
  getAcademicPeriodMarkers,
  PeriodMarker,
  formatTo12Hour,
  formatMinutesTo12Hour,
} from '../utils/timeCalculations';
import { parseAlternatingSchedule } from '../utils/alternatingLabEngine';

interface MasterTimelineGridProps {
  days: Array<'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Saturday'>;
  events: RoutineEvent[];
  todayName: string;
  currentMinuteOffset: number | null;
  onSelectEvent: (event: RoutineEvent) => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  theme?: 'light' | 'dark';
  selectedGroup?: 'All' | 'Group A' | 'Group B';
  highlightedEventKey?: string | null;
  totalDayMinutes?: number;
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
  highlightedEventKey = null,
  totalDayMinutes = TOTAL_DAY_MINUTES,
}) => {
  const safeTotalMinutes = Math.max(TOTAL_DAY_MINUTES, totalDayMinutes);
  const periodMarkers: PeriodMarker[] = getAcademicPeriodMarkers(safeTotalMinutes);
  const isDark = theme === 'dark';

  const minTrackWidthPx = Math.round((safeTotalMinutes / TOTAL_DAY_MINUTES) * 1145) + 48;
  const internalScrollRef = useRef<HTMLDivElement | null>(null);
  const activeScrollRef = scrollRef ?? internalScrollRef;
  const headerAxisRef = useRef<HTMLDivElement | null>(null);
  const [axisWidthPx, setAxisWidthPx] = useState<number>(minTrackWidthPx - 48);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);

  const syncScrollState = (el: HTMLDivElement | null) => {
    if (!el) return;
    setIsScrolled((prev) => {
      const hasEnoughOverflow = el.scrollWidth - el.clientWidth > 32;
      if (!hasEnoughOverflow) return false;
      if (!prev && el.scrollLeft > 32) return true;
      if (prev && el.scrollLeft < 12) return false;
      return prev;
    });
  };

  useEffect(() => {
    const el = headerAxisRef.current;
    if (!el) return;

    const updateWidth = () => {
      if (el.clientWidth > 0) {
        setAxisWidthPx(el.clientWidth);
      }
      syncScrollState(activeScrollRef.current);
    };

    updateWidth();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateWidth);
      observer.observe(el);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [minTrackWidthPx, activeScrollRef]);

  const isNowVisible =
    currentMinuteOffset !== null &&
    currentMinuteOffset >= 0 &&
    currentMinuteOffset <= safeTotalMinutes;
  const nowLeftPercent = isNowVisible ? (currentMinuteOffset / safeTotalMinutes) * 100 : null;
  const nowCenterX = nowLeftPercent !== null ? (nowLeftPercent / 100) * axisWidthPx : null;

  return (
    <div className="flex flex-col">
      <div
        className={`relative rounded-2xl overflow-hidden shadow-2xs flex items-stretch select-none border transition-colors ${
          isDark
            ? 'bg-[#161514] border-stone-800'
            : 'bg-[#F4F3EF] border-stone-200'
        }`}
      >
      {/* Unbroken full-width header divider rendered at z-30 strictly above the edge-fade fogs */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute top-11 left-0 right-0 h-px z-30 transition-colors ${
          isDark ? 'bg-white/[0.06]' : 'bg-black/[0.06]'
        }`}
      />

      {/* 1. GPU-COMPOSITED OVERLAY DAY RAIL: Out-of-flow so the scroll container never reflows during touch scroll */}
      <div
        className={`absolute top-0 bottom-0 left-0 flex flex-col z-20 will-change-transform transform-gpu transition-[width,transform,opacity] duration-[420ms] ease-[cubic-bezier(0.25,1.18,0.45,1)] ${
          isScrolled ? 'w-[48px]' : 'w-[108px]'
        } ${isDark ? 'bg-[#161514]' : 'bg-[#F4F3EF]'}`}
      >
        {/* Full-height left-edge fog glued to the rail's right edge so it glides cleanly with zero layout thrash */}
        <div
          aria-hidden="true"
          className="timeline-fade-left pointer-events-none absolute top-0 bottom-0 left-full w-7"
        />

        {/* Static Header Axis Box (h-11) — Day label fades out cleanly when scrolled */}
        <div
          className={`h-11 flex items-center justify-center text-center text-xs font-bold tracking-tight leading-none transition-colors ${
            isDark
              ? 'bg-[#161514] text-stone-100'
              : 'bg-[#F4F3EF] text-stone-900'
          }`}
        >
          <span
            aria-hidden={isScrolled || undefined}
            className={`will-change-transform transform-gpu transition-opacity duration-[420ms] ease-[cubic-bezier(0.25,1.18,0.45,1)] ${
              isScrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            Day
          </span>
        </div>

        {/* Static Day Rows with Smooth Locked rounded-2xl Pill (h-24) */}
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
              className="h-24 py-2 flex items-center justify-center bg-transparent"
            >
              {/* Centered Day Card / Vertical Pill — locked rounded-2xl & GPU-promoted */}
              <div
                className={`h-full rounded-2xl flex flex-col items-center justify-center text-center border overflow-hidden will-change-transform transform-gpu transition-[width,transform,opacity] duration-[420ms] ease-[cubic-bezier(0.25,1.18,0.45,1)] ${
                  isScrolled ? 'w-[36px]' : 'w-[96px]'
                } ${
                  isToday
                    ? isDark
                      ? 'bg-stone-100 border-stone-100 text-stone-900 shadow-xs'
                      : 'bg-stone-900 border-stone-900 text-stone-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_1px_2px_0_rgba(0,0,0,0.12)]'
                    : isDark
                    ? 'bg-[#1C1A18] border-stone-800 text-stone-100 hover:border-stone-700'
                    : 'bg-white border-stone-200 text-stone-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_1px_2px_0_rgba(0,0,0,0.03)] hover:border-stone-300'
                }`}
              >
                <div className="flex items-center justify-center leading-none">
                  <span
                    className={`inline-block font-bold text-base tracking-tight will-change-transform transform-gpu transition-transform duration-[420ms] ease-[cubic-bezier(0.25,1.18,0.45,1)] whitespace-nowrap ${
                      isScrolled ? '-rotate-90 scale-[0.8]' : 'rotate-0 scale-100'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </span>
                </div>
                <div
                  className={`flex items-center justify-center text-[10px] tracking-normal leading-none whitespace-nowrap overflow-hidden will-change-transform transform-gpu transition-[max-height,opacity,margin] duration-[420ms] ease-[cubic-bezier(0.25,1.18,0.45,1)] ${
                    isScrolled ? 'opacity-0 max-h-0 mt-0' : 'opacity-100 max-h-5 mt-1'
                  }`}
                  aria-hidden={isScrolled || undefined}
                >
                  <span className="opacity-85">
                    {dayEventsCount === 0
                      ? 'Free day'
                      : dayEventsCount === 1
                      ? 'Just 1 class'
                      : `${dayEventsCount} classes`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. FULL-WIDTH TIMELINE TRACK CONTAINER (CONSTANT clientWidth — ZERO LAYOUT THRASH ON SCROLL) */}
      <div className="relative flex-1 min-w-0 overflow-hidden flex flex-col">
        {/* Full-height right edge-fade overlay (top-0 bottom-0, z-20 beneath z-30 divider) */}
        <div
          aria-hidden="true"
          className="timeline-fade-right pointer-events-none absolute top-0 bottom-0 right-0 w-7 z-20"
        />

        <div
          ref={activeScrollRef}
          onScroll={(e) => syncScrollState(e.currentTarget)}
          className={`flex-1 overflow-x-auto scroll-smooth timeline-touch-track transition-colors [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
            isDark ? 'bg-[#161514]' : 'bg-[#F4F3EF]'
          }`}
        >
          <div
            className="pl-[108px]"
            style={{ minWidth: `${minTrackWidthPx + 108}px` }}
          >
          <div className="relative flex flex-col w-full">
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
            className={`relative z-10 h-11 px-6 flex items-center select-none transition-colors ${
              isDark ? 'bg-[#161514]' : 'bg-[#F4F3EF]'
            }`}
          >
            <div ref={headerAxisRef} className="relative w-full h-full flex items-center">
              {periodMarkers.map((marker) => {
                const markerCenterX = (marker.leftPercent / 100) * axisWidthPx;
                const isCollidingWithNow =
                  nowCenterX !== null && Math.abs(markerCenterX - nowCenterX) <= 48;

                return (
                  <div
                    key={marker.timeStr}
                    style={{ left: `${marker.leftPercent}%` }}
                    aria-hidden={isCollidingWithNow || undefined}
                    className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 flex items-center text-[10px] font-sans font-medium whitespace-nowrap tabular-nums leading-none pointer-events-none transition-opacity duration-150 ${
                      isCollidingWithNow ? 'opacity-0' : 'opacity-100'
                    } ${isDark ? 'text-stone-400' : 'text-stone-500'}`}
                  >
                    {formatTo12Hour(marker.timeStr)}
                  </div>
                );
              })}

              {/* Inline Live Current-Time Crimson Pill centered vertically over timestamps */}
              {isNowVisible && nowLeftPercent !== null && currentMinuteOffset !== null && (
                <>
                  {/* 1.5px vertical stem extending downward from bottom center of pill */}
                  <div
                    style={{ left: `${nowLeftPercent}%` }}
                    className={`absolute top-[calc(50%+11px)] bottom-0 -translate-x-1/2 w-[1.5px] z-10 pointer-events-none ${
                      isDark ? 'bg-[#C84B4D]' : 'bg-[#9E2A2B]'
                    }`}
                  />
                  <div
                    style={{ left: `${nowLeftPercent}%` }}
                    className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-6 px-2.5 rounded-full text-[11px] font-sans font-semibold leading-none tabular-nums inline-flex items-center justify-center whitespace-nowrap shadow-sm z-20 pointer-events-none ${
                      isDark
                        ? 'bg-[#C84B4D] text-white'
                        : 'bg-[#9E2A2B] text-white'
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
                data-day={day.toLowerCase()}
                className="relative z-10 h-24 px-6 py-1 bg-transparent transition-colors"
              >
                <div className="relative w-full h-full">
                  {/* Live Current Time Vertical Line for Today (always pinned above cards) */}
                  {isToday && isNowVisible && nowLeftPercent !== null && (
                    <div
                      style={{ left: `${nowLeftPercent}%` }}
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
                            totalDayMinutes={safeTotalMinutes}
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
  </div>
);
};
