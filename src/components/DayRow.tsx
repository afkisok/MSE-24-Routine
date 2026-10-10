import React from 'react';
import { RoutineEvent } from '../types/routine';
import { SlotCard } from './SlotCard';
import { getAcademicPeriodMarkers, PeriodMarker } from '../utils/timeCalculations';

interface DayRowProps {
  dayName: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  dayIndex: number;
  events: RoutineEvent[];
  isToday: boolean;
  currentMinuteOffset?: number | null;
  onSelectEvent: (event: RoutineEvent) => void;
}

export const DayRow: React.FC<DayRowProps> = ({
  dayName,
  events,
  isToday,
  currentMinuteOffset,
  onSelectEvent,
}) => {
  const periodMarkers: PeriodMarker[] = getAcademicPeriodMarkers();
  const sortedEvents = [...events].sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className={`relative flex items-stretch border-b border-[#E2E8F0] ${isToday ? 'bg-slate-50/70' : 'bg-white'}`}>
      {/* Sticky Day Column */}
      <div className="w-24 sm:w-32 shrink-0 p-2 flex items-center justify-center border-r border-[#E2E8F0] bg-slate-50/60 z-10 sticky left-0 shadow-2xs">
        <div
          className={`w-full h-full rounded-xs p-2 flex flex-col justify-between transition-all border ${
            isToday
              ? 'bg-[#0F172A] border-[#0F172A] text-white shadow-xs'
              : 'bg-white border-[#E2E8F0] text-[#0F172A]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-normal font-sans">
              {dayName.slice(0, 3)}
            </span>
            {isToday && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
            )}
          </div>
          <span
            className={`text-[10px] font-sans tabular-nums px-1 py-0.2 rounded-2xs mt-1 ${
              isToday ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {events.length} {events.length === 1 ? 'class' : 'classes'}
          </span>
        </div>
      </div>

      {/* Timeline Track Container with 1px #E2E8F0 Hairlines */}
      <div className="relative flex-1 min-w-[760px] md:min-w-0 h-24 py-1.5">
        {/* Background Vertical 1px #E2E8F0 Hairlines */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {periodMarkers.map((marker) => (
            <div
              key={marker.timeStr}
              style={{ left: `${marker.leftPercent}%` }}
              className="absolute top-0 bottom-0 w-px border-l border-[#E2E8F0]"
            />
          ))}
        </div>

        {/* Live Current Time Vertical Line for Today */}
        {isToday &&
          currentMinuteOffset !== undefined &&
          currentMinuteOffset !== null &&
          currentMinuteOffset >= 0 &&
          currentMinuteOffset <= 540 && (
            <div
              style={{ left: `${(currentMinuteOffset / 540) * 100}%` }}
              className="absolute top-0 bottom-0 -translate-x-1/2 w-0.5 bg-[#0F172A] z-20 pointer-events-none opacity-90"
            />
          )}

        {/* Event Slots Container */}
        <div className="relative w-full h-full">
          {sortedEvents.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs font-sans text-slate-400">
              No classes scheduled
            </div>
          ) : (
            sortedEvents.map((event, idx) => (
              <SlotCard
                key={event.id || `${dayName}-${event.startTime}-${idx}`}
                event={event}
                onSelect={onSelectEvent}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
