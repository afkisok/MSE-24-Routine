import React, { useRef } from 'react';
import { RoutineEvent, AssignmentItem } from '../types/routine';
import { formatTimeTo12Hour } from '../utils/timeCalculations';

interface MobileSnapCarouselProps {
  days: Array<'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday'>;
  events: RoutineEvent[];
  assignments?: AssignmentItem[];
  todayName: string;
  onSelectEvent: (event: RoutineEvent) => void;
}

export const MobileSnapCarousel: React.FC<MobileSnapCarouselProps> = ({
  days,
  events,
  assignments = [],
  todayName,
  onSelectEvent,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="brutal-mobile-wrapper"
      style={{
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Visual Navigation Subheader */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#222222] bg-black text-[10px] font-mono text-[#888888]">
        <span className="flex items-center gap-1.5 uppercase tracking-widest text-white">
          <span className="w-2 h-2 bg-white inline-block"></span>
          SNAP CAROUSEL [SWIPE DAYS]
        </span>
        <span className="tracking-widest">[85VW MOBILE LOCK]</span>
      </div>

      {/* The side-scrolling inner snap track container */}
      <div
        ref={scrollRef}
        className="brutal-snap-track"
        style={{
          display: 'flex',
          flexWrap: 'nowrap',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          touchAction: 'pan-x pan-y', // NO TOUCH TRAP: Unlocks vertical page scrolling on thumb swipe
          WebkitOverflowScrolling: 'touch',
          gap: '16px',
          padding: '20px 16px',
        }}
      >
        {days.map((day, dayIndex) => {
          const isToday = day.toLowerCase() === todayName.toLowerCase();
          const dayEvents = events
            .filter((e) => e.day.toLowerCase() === day.toLowerCase())
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          const hasAssignment = assignments.some(
            (a) => a.day.toLowerCase() === day.toLowerCase()
          );

          return (
            <div
              key={day}
              className={`brutal-snap-card border border-[#2B2B2B] bg-[#050505] flex flex-col justify-between select-none ${
                hasAssignment ? 'border-l-4 border-l-[#A855F7]' : ''
              }`}
              style={{
                flex: '0 0 85vw',
                maxWidth: '85vw',
                scrollSnapAlign: 'start',
                boxSizing: 'border-box',
              }}
            >
              {/* Day Card Header with Solid Purple Element */}
              <div
                className={`border-b border-[#222222] p-3.5 bg-black flex items-center justify-between ${
                  hasAssignment ? 'bg-[#0E061A]' : ''
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-lg font-syne font-extrabold uppercase tracking-tight ${
                        hasAssignment ? 'text-[#E9D5FF]' : 'text-white'
                      }`}
                    >
                      {day}
                    </span>
                    {isToday && (
                      <span className="bg-white text-black font-mono text-[9px] font-bold px-1.5 py-0.5 uppercase tracking-widest">
                        TODAY
                      </span>
                    )}
                    {hasAssignment && (
                      <span className="bg-[#A855F7] text-white font-mono text-[9px] font-bold px-1.5 py-0.5 uppercase tracking-widest">
                        HW_ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-[#666666] uppercase mt-0.5">
                    INDEX: 0{dayIndex + 1} // {dayEvents.length} TOTAL SESSIONS
                  </div>
                </div>

                <div className="text-[11px] font-mono text-[#444444] font-bold">
                  [0{dayIndex + 1}/05]
                </div>
              </div>

              {/* Sessions List */}
              <div className="p-3 space-y-2.5 flex-1 min-h-[320px] overflow-y-auto max-h-[460px]">
                {dayEvents.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-[10px] font-mono text-[#444444] uppercase tracking-widest text-center border border-dashed border-[#1A1A1A]">
                    [ NO ACTIVE SESSIONS RECORDED ]
                  </div>
                ) : (
                  dayEvents.map((evt, idx) => {
                    const isCancelled = evt.status === 'Cancelled';
                    const isExam = evt.type === 'Exam';
                    const isLab = evt.type === 'Lab';

                    return (
                      <div
                        key={evt.id || idx}
                        onClick={() => onSelectEvent(evt)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onSelectEvent(evt);
                        }}
                        className={`relative p-3 border cursor-pointer transition-none ${
                          isCancelled
                            ? 'bg-black border-red-950/60 opacity-40 hover:opacity-80'
                            : isExam
                            ? 'bg-black border-2 border-[#FFCC00] hover:bg-[#FFCC00] hover:text-black group'
                            : isLab
                            ? 'bg-black border border-[#00FF66]/50 hover:bg-white hover:text-black group'
                            : 'bg-black border border-[#262626] hover:bg-white hover:text-black group'
                        }`}
                      >
                        {/* Cancelled diagonal X overlay */}
                        {isCancelled && (
                          <svg
                            className="absolute inset-0 w-full h-full pointer-events-none z-20"
                            preserveAspectRatio="none"
                          >
                            <line
                              x1="0"
                              y1="0"
                              x2="100%"
                              y2="100%"
                              stroke="rgba(239, 68, 68, 0.85)"
                              strokeWidth="2"
                            />
                            <line
                              x1="0"
                              y1="100%"
                              x2="100%"
                              y2="0"
                              stroke="rgba(239, 68, 68, 0.85)"
                              strokeWidth="2"
                            />
                          </svg>
                        )}

                        {/* Top row */}
                        <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-wider mb-1">
                          <span
                            className={`font-bold ${
                              isExam
                                ? 'text-[#FFCC00] group-hover:text-black'
                                : isLab
                                ? 'text-[#00FF66] group-hover:text-black'
                                : 'text-[#888888] group-hover:text-black'
                            } ${isCancelled ? 'line-through text-red-400' : ''}`}
                          >
                            [{evt.type}]
                          </span>
                          <span className="text-[#666666] group-hover:text-black tabular-nums">
                            {evt.startTime} – {evt.endTime}
                          </span>
                        </div>

                        {/* Subject */}
                        <div
                          className={`text-xs font-syne font-bold uppercase leading-snug tracking-tight mb-2 ${
                            isCancelled
                              ? 'line-through text-[#666666]'
                              : isExam
                              ? 'text-[#FFCC00] group-hover:text-black'
                              : 'text-white group-hover:text-black'
                          }`}
                        >
                          {evt.subject}
                        </div>

                        {/* Room & Teacher */}
                        <div
                          className={`flex items-center justify-between text-[10px] font-mono border-t border-[#1F1F1F] group-hover:border-black/20 pt-1.5 ${
                            isCancelled ? 'line-through text-[#555555]' : 'text-[#888888] group-hover:text-black'
                          }`}
                        >
                          <span className="truncate">{evt.room || 'TBA'}</span>
                          <span className="font-bold shrink-0 ml-2">
                            {evt.teacher.split('(')[0].trim()}
                          </span>
                        </div>

                        {isExam && evt.marks && (
                          <div className="mt-1.5 text-[9px] font-mono text-[#FFCC00] group-hover:text-black uppercase">
                            WEIGHT: {evt.marks}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Day Card Footer */}
              <div className="border-t border-[#222222] p-2.5 bg-black flex items-center justify-between text-[9px] font-mono text-[#666666]">
                <span>OPERATIONAL: 08:00-17:00</span>
                <span className="text-white uppercase font-bold">[TAP CARD TO INSPECT]</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
