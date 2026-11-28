import React, { useEffect, useRef, useState } from 'react';
import { animate, motion } from 'motion/react';
import { RoutineEvent } from '../types/routine';
import { SlotCard } from './SlotCard';
import { STARTUP_POP_SPRING, STARTUP_TEXT_SPRING, UNIFIED_SPRING } from '../utils/springs';
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
  const [showLeftFade, setShowLeftFade] = useState<boolean>(false);
  const [showRightFade, setShowRightFade] = useState<boolean>(false);
  const scrollAnimRef = useRef<{ stop: () => void } | null>(null);
  const scrollCleanupRef = useRef<(() => void) | null>(null);

  const stopScrollToStart = () => {
    if (scrollAnimRef.current) {
      scrollAnimRef.current.stop();
      scrollAnimRef.current = null;
    }
    if (scrollCleanupRef.current) {
      scrollCleanupRef.current();
      scrollCleanupRef.current = null;
    }
  };

  const scrollToStart = () => {
    const container = activeScrollRef.current;
    if (!container || container.scrollLeft <= 0) return;

    stopScrollToStart();

    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      container.scrollLeft = 0;
      return;
    }

    const cancelOnUserInteract = () => stopScrollToStart();
    const cleanupListeners = () => {
      container.removeEventListener('wheel', cancelOnUserInteract);
      container.removeEventListener('touchstart', cancelOnUserInteract);
      container.removeEventListener('pointerdown', cancelOnUserInteract);
    };

    scrollCleanupRef.current = cleanupListeners;
    container.addEventListener('wheel', cancelOnUserInteract, { passive: true, once: true });
    container.addEventListener('touchstart', cancelOnUserInteract, { passive: true, once: true });
    container.addEventListener('pointerdown', cancelOnUserInteract, { passive: true, once: true });

    const controls = animate(container.scrollLeft, 0, {
      type: 'spring',
      stiffness: 180,
      damping: 26,
      mass: 0.9,
      onUpdate: (latest) => {
        container.scrollLeft = latest;
      },
      onComplete: () => {
        if (scrollCleanupRef.current === cleanupListeners) {
          cleanupListeners();
          scrollCleanupRef.current = null;
        }
        if (scrollAnimRef.current === controls) {
          scrollAnimRef.current = null;
        }
      },
    });

    scrollAnimRef.current = controls;
  };

  useEffect(() => {
    return () => stopScrollToStart();
  }, []);

  const syncScrollState = (el: HTMLDivElement | null) => {
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const leftOffset = el.scrollLeft;
    const rightRemaining = maxScroll - leftOffset;

    const nextShowLeft = maxScroll > 16 && leftOffset > 16;
    const nextShowRight = maxScroll > 16 && rightRemaining > 16;

    setShowLeftFade((prev) => (prev === nextShowLeft ? prev : nextShowLeft));
    setShowRightFade((prev) => (prev === nextShowRight ? prev : nextShowRight));

    setIsScrolled((prev) => {
      const hasEnoughOverflow = maxScroll > 32;
      if (!hasEnoughOverflow) return false;
      if (!prev && leftOffset > 32) return true;
      if (prev && leftOffset < 12) return false;
      return prev;
    });
  };

  useEffect(() => {
    const el = headerAxisRef.current;
    const scrollEl = activeScrollRef.current;
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
      if (scrollEl) observer.observe(scrollEl);
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
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ ...STARTUP_TEXT_SPRING, delay: 0.33 }}
        className={`relative rounded-2xl overflow-hidden flex items-stretch select-none border transition-colors ${
          isDark
            ? 'bg-[#100F0E] border-transparent'
            : 'bg-[#EAE8E2] border-transparent'
        }`}
      >
      {/* Subtle recessed tray inner shadow overlay (rendered above opaque rail/track edges) */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 rounded-2xl z-30 ${
          isDark
            ? 'shadow-[inset_0_4px_22px_rgba(0,0,0,0.13),inset_0_1px_8px_rgba(0,0,0,0.08),inset_0_-1px_0_rgba(255,255,255,0.018)]'
            : 'shadow-[inset_0_3px_18px_rgba(24,23,22,0.028),inset_0_1px_6px_rgba(24,23,22,0.015)]'
        }`}
      />

      {/* Unbroken full-width header divider rendered at z-30 strictly above the edge-fade fogs */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute top-11 left-0 right-0 h-px z-30 transition-colors ${
          isDark ? 'bg-white/[0.06]' : 'bg-black/[0.06]'
        }`}
      />

      {/* 1. GPU-COMPOSITED OVERLAY DAY RAIL: Spring-driven collapse & expand with zero scroll reflow */}
      <motion.div
        initial={false}
        animate={{ width: isScrolled ? 48 : 108 }}
        transition={UNIFIED_SPRING}
        className={`absolute top-0 bottom-0 left-0 flex flex-col z-20 will-change-transform transform-gpu ${
          isDark ? 'bg-[#100F0E]' : 'bg-[#EAE8E2]'
        }`}
      >
        {/* Full-height left-edge stacked scrim fog glued to the rail's right edge */}
        <div
          aria-hidden="true"
          className={`timeline-fade-left pointer-events-none absolute top-0 bottom-0 left-full w-14 transition-opacity duration-200 ease-out ${
            showLeftFade ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Static Header Axis Box (h-11) — Day label fades out cleanly when scrolled */}
        <div
          className={`h-11 flex items-center justify-center text-center text-xs font-bold tracking-tight leading-none transition-colors ${
            isDark
              ? 'bg-[#100F0E] text-stone-100'
              : 'bg-[#EAE8E2] text-stone-900'
          }`}
        >
          <motion.span
            initial={false}
            animate={{
              opacity: isScrolled ? 0 : 1,
              scale: isScrolled ? 0.88 : 1,
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 28, mass: 0.8 }}
            aria-hidden={isScrolled || undefined}
            className={`will-change-transform transform-gpu ${
              isScrolled ? 'pointer-events-none' : ''
            }`}
          >
            <motion.span
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...STARTUP_TEXT_SPRING, delay: 0.37 }}
              className="inline-block"
            >
              Day
            </motion.span>
          </motion.span>
        </div>

        {/* Static Day Rows with Spring-Animated rounded-2xl Pill (h-24) */}
        {days.map((day, dayIdx) => {
          const isToday = day.toLowerCase() === todayName.toLowerCase();
          const dayEventsCount = events.filter((e) => {
            if (e.day.toLowerCase() !== day.toLowerCase()) return false;
            const status = (e.status || '').trim().toLowerCase();
            if (status === 'cancelled' || status === 'canceled') return false;
            const meta = parseAlternatingSchedule(e.type, e.subject, e.syllabus);
            if (selectedGroup === 'Group A' && meta.groupVariant === 'B') return false;
            if (selectedGroup === 'Group B' && meta.groupVariant === 'A') return false;
            return true;
          }).length;

          return (
            <div
              key={`static-${day}`}
              className="h-24 py-2 flex items-center justify-center bg-transparent"
            >
              <motion.div
                initial={{ opacity: 0, x: -10, scale: 0.92 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ ...STARTUP_POP_SPRING, delay: 0.35 + dayIdx * 0.045 }}
                className="h-full flex items-center justify-center"
              >
              {/* Centered Day Card / Vertical Pill — synchronized spring physics */}
              <motion.div
                initial={false}
                animate={{ width: isScrolled ? 36 : 96 }}
                whileHover={isScrolled ? { scale: 1.06 } : undefined}
                whileTap={isScrolled ? { scale: 0.94 } : undefined}
                transition={UNIFIED_SPRING}
                onClick={isScrolled ? scrollToStart : undefined}
                role={isScrolled ? 'button' : undefined}
                tabIndex={isScrolled ? 0 : undefined}
                title={isScrolled ? 'Scroll to start of routine' : undefined}
                aria-label={isScrolled ? `Scroll to start of ${day} routine` : undefined}
                onKeyDown={
                  isScrolled
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          scrollToStart();
                        }
                      }
                    : undefined
                }
                className={`relative h-full rounded-2xl flex flex-col items-center justify-center text-center border overflow-hidden will-change-transform transform-gpu ${
                  isScrolled ? 'cursor-pointer' : ''
                } ${
                  isToday
                    ? isDark
                      ? 'bg-stone-100 border-transparent text-stone-900'
                      : 'bg-stone-900 border-transparent text-stone-50'
                    : isDark
                    ? 'bg-[#1E1D1C] border-transparent text-stone-100 hover:bg-[#242321]'
                    : 'bg-white border-transparent text-stone-900 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center justify-center leading-none">
                  <motion.span
                    initial={false}
                    animate={{
                      y: isScrolled ? 0 : -7,
                      rotate: isScrolled ? -90 : 0,
                      scale: isScrolled ? 0.8 : 1,
                    }}
                    transition={UNIFIED_SPRING}
                    className="inline-block font-bold text-base tracking-tight will-change-transform transform-gpu whitespace-nowrap"
                  >
                    {day.slice(0, 3)}
                  </motion.span>
                </div>
                <div
                  className={`pointer-events-none absolute left-1/2 -translate-x-1/2 top-[calc(50%+6px)] flex items-center justify-center text-[10px] tracking-normal leading-none whitespace-nowrap transition-opacity ease-out ${
                    isScrolled
                      ? 'opacity-0 duration-75 delay-0'
                      : 'opacity-100 duration-150 delay-[70ms]'
                  }`}
                  aria-hidden={isScrolled || undefined}
                >
                  <span className="opacity-85">
                    {dayEventsCount === 0
                      ? 'Free day'
                      : dayEventsCount === 1
                      ? 'Just 1 event'
                      : `${dayEventsCount} events`}
                  </span>
                </div>
              </motion.div>
              </motion.div>
            </div>
          );
        })}
      </motion.div>

      {/* 2. FULL-WIDTH TIMELINE TRACK CONTAINER (CONSTANT clientWidth — ZERO LAYOUT THRASH ON SCROLL) */}
      <div className="relative flex-1 min-w-0 overflow-hidden flex flex-col">
        {/* Full-height right edge-fade stacked scrim overlay (top-0 bottom-0, z-20 beneath z-30 divider) */}
        <div
          aria-hidden="true"
          className={`timeline-fade-right pointer-events-none absolute top-0 bottom-0 right-0 w-14 z-20 transition-opacity duration-200 ease-out ${
            showRightFade ? 'opacity-100' : 'opacity-0'
          }`}
        />

        <div
          ref={activeScrollRef}
          onScroll={(e) => syncScrollState(e.currentTarget)}
          className={`flex-1 overflow-x-auto timeline-touch-track transition-colors [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
            isDark ? 'bg-[#100F0E]' : 'bg-[#EAE8E2]'
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
              isDark ? 'bg-[#100F0E]' : 'bg-[#EAE8E2]'
            }`}
          >
            <div ref={headerAxisRef} className="relative w-full h-full flex items-center">
              {periodMarkers.map((marker, markerIdx) => {
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
                    <motion.span
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        ...STARTUP_TEXT_SPRING,
                        delay: Math.min(0.62, 0.36 + markerIdx * 0.025),
                      }}
                      className="inline-block"
                    >
                      {formatTo12Hour(marker.timeStr)}
                    </motion.span>
                  </div>
                );
              })}

              {/* Inline Live Current-Time Crimson Pill centered vertically over timestamps */}
              {isNowVisible && nowLeftPercent !== null && currentMinuteOffset !== null && (
                <>
                  {/* 1.5px vertical stem extending downward from bottom center of pill */}
                  <motion.div
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ scaleY: 1, opacity: 1 }}
                    transition={{ ...STARTUP_TEXT_SPRING, delay: 0.44 }}
                    style={{ left: `${nowLeftPercent}%`, transformOrigin: 'top center' }}
                    className="absolute top-[calc(50%+11px)] bottom-0 -translate-x-1/2 w-[1.5px] z-10 pointer-events-none bg-[#9E2C2C]"
                  />
                  <div
                    style={{ left: `${nowLeftPercent}%` }}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 pointer-events-none"
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.72, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ ...STARTUP_POP_SPRING, delay: 0.46 }}
                      className="h-6 px-2.5 rounded-full text-[11px] font-sans font-semibold leading-none tabular-nums inline-flex items-center justify-center whitespace-nowrap shadow-sm bg-[#9E2C2C] text-white"
                    >
                      {formatMinutesTo12Hour(DAY_START_MINUTES + currentMinuteOffset)}
                    </motion.div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Synchronized Day Tracks with symmetric px-6 buffer */}
          {days.map((day, dayIdx) => {
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
                    <motion.div
                      initial={{ scaleY: 0, opacity: 0 }}
                      animate={{ scaleY: 1, opacity: isDark ? 0.9 : 0.85 }}
                      transition={{ duration: 0.42, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
                      style={{ left: `${nowLeftPercent}%`, transformOrigin: 'top center' }}
                      className="absolute -top-1 -bottom-1 -translate-x-1/2 w-[1.5px] z-30 pointer-events-none bg-[#9E2C2C]"
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
                            startupDelay={Math.min(0.66, 0.38 + dayIdx * 0.045 + idx * 0.03)}
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
      </motion.div>
  </div>
);
};
