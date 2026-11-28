import React from 'react';
import { motion } from 'motion/react';
import { TermFinalExam } from '../types/routine';
import { formatTo12Hour } from '../utils/timeCalculations';
import { STARTUP_POP_SPRING, STARTUP_TEXT_SPRING } from '../utils/springs';
import {
  isTermFinalPast,
  isTermFinalUpcoming,
  sortTermFinalsChronologically,
} from '../utils/termFinalUtils';

interface TermFinalsListProps {
  termFinals: TermFinalExam[];
  nowMs: number;
  theme?: 'light' | 'dark';
  onSelectExam: (exam: TermFinalExam) => void;
}

interface TermFinalDateGroup {
  dateISO: string;
  displayDate: string;
  weekdayShort: string;
  exams: TermFinalExam[];
}

export const TermFinalsList: React.FC<TermFinalsListProps> = ({
  termFinals,
  nowMs,
  theme = 'light',
  onSelectExam,
}) => {
  const isDark = theme === 'dark';
  const sorted = sortTermFinalsChronologically(termFinals);

  // Identify the date of the next chronological upcoming active exam
  const nextUpcomingExam = sorted.find((exam) => isTermFinalUpcoming(exam, nowMs)) || null;
  const nextUpcomingDateISO = nextUpcomingExam?.dateISO || null;

  // Group exams by date while preserving chronological order
  const dateGroups: TermFinalDateGroup[] = [];
  const groupMap = new Map<string, TermFinalDateGroup>();

  for (const exam of sorted) {
    let group = groupMap.get(exam.dateISO);
    if (!group) {
      group = {
        dateISO: exam.dateISO,
        displayDate: exam.displayDate,
        weekdayShort: exam.weekdayShort,
        exams: [],
      };
      groupMap.set(exam.dateISO, group);
      dateGroups.push(group);
    }
    group.exams.push(exam);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...STARTUP_TEXT_SPRING, delay: 0.33 }}
      className={`rounded-2xl p-2 border select-none transition-colors ${
        isDark
          ? 'bg-[#100F0E] border-transparent shadow-[inset_0_4px_22px_rgba(0,0,0,0.13),inset_0_1px_8px_rgba(0,0,0,0.08),inset_0_-1px_0_rgba(255,255,255,0.018)]'
          : 'bg-[#EAE8E2] border-transparent shadow-[inset_0_3px_18px_rgba(24,23,22,0.028),inset_0_1px_6px_rgba(24,23,22,0.015)]'
      }`}
    >
      <div className="flex flex-col gap-2">
        {dateGroups.map((group, groupIdx) => {
          const isNextDate = group.dateISO === nextUpcomingDateISO;
          const isEntireDatePast = group.exams.every(
            (exam) => exam.status !== 'Cancelled' && isTermFinalPast(exam, nowMs)
          );
          const rowDelay = 0.37 + Math.min(groupIdx * 0.045, 0.22);

          return (
            <div
              key={group.dateISO}
              className="flex items-stretch gap-2 w-full min-w-0"
            >
              {/* Left Date Badge Tile (Fixed compact w-20, centered vertically) */}
              <motion.div
                initial={{ opacity: 0, x: -8, scale: 0.94 }}
                animate={{ opacity: isEntireDatePast ? 0.45 : 1, x: 0, scale: 1 }}
                transition={{ ...STARTUP_POP_SPRING, delay: rowDelay }}
                className={`w-20 shrink-0 rounded-xl px-2 py-2.5 flex flex-col items-center justify-center text-center transition-colors border ${
                  isNextDate
                    ? isDark
                      ? 'bg-stone-100 border-transparent text-stone-900'
                      : 'bg-stone-900 border-transparent text-stone-50'
                    : isDark
                    ? 'bg-[#1E1D1C] border-transparent text-stone-100'
                    : 'bg-white border-transparent text-stone-900'
                }`}
              >
                <span className="text-sm font-bold tracking-tight leading-none whitespace-nowrap">
                  {group.displayDate}
                </span>
                <span className="mt-1.5 text-[11px] font-medium tracking-normal opacity-80 leading-none">
                  {group.weekdayShort}
                </span>
              </motion.div>

              {/* Right Full-Width Exam Card(s) */}
              <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
                {group.exams.map((exam, examIdx) => {
                  const isCancelled = exam.status === 'Cancelled';
                  const isPast = !isCancelled && isTermFinalPast(exam, nowMs);
                  const timeWindow = `${formatTo12Hour(exam.startTime)} – ${formatTo12Hour(exam.endTime)}`;

                  return (
                    <motion.div
                      key={exam.id}
                      initial={{ opacity: 0, y: 10, scale: 0.975 }}
                      animate={{ opacity: isPast ? 0.45 : 1, y: 0, scale: 1 }}
                      transition={{ ...STARTUP_TEXT_SPRING, delay: rowDelay + 0.03 + examIdx * 0.03 }}
                      onClick={() => onSelectExam(exam)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectExam(exam);
                        }
                      }}
                      className={`w-full rounded-xl px-3.5 py-3 sm:px-4 sm:py-3.5 border transition-colors duration-150 ease-out active:scale-[0.99] cursor-pointer focus-visible:outline-none focus-visible:ring-1 ${
                        isDark ? 'focus-visible:ring-stone-100' : 'focus-visible:ring-stone-900'
                      } ${
                        isCancelled
                          ? isDark
                            ? 'bg-transparent border-dashed border-stone-700 text-stone-500'
                            : 'bg-transparent border-dashed border-stone-300 text-stone-400'
                          : isDark
                          ? 'bg-[#1E1D1C] border-transparent text-stone-100 hover:bg-[#242321]'
                          : 'bg-white border-transparent text-stone-900 hover:bg-stone-50'
                      }`}
                    >
                      {/* 1. Top Metadata Line: Time Window */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs font-medium font-sans tabular-nums ${
                            isCancelled
                              ? isDark
                                ? 'text-stone-500'
                                : 'text-stone-400'
                              : isDark
                              ? 'text-stone-400'
                              : 'text-stone-500'
                          }`}
                        >
                          {timeWindow}
                        </span>

                        {isCancelled && (
                          <span
                            className={`text-[10px] font-semibold uppercase tracking-wider shrink-0 ${
                              isDark ? 'text-stone-500' : 'text-stone-400'
                            }`}
                          >
                            Canceled
                          </span>
                        )}
                      </div>

                      {/* 2. Primary Focus: Bold Course Code & Course Title */}
                      <div className="mt-1.5 min-w-0">
                        <div
                          className={`text-base font-bold tracking-tight leading-snug ${
                            isCancelled
                              ? 'line-through'
                              : isDark
                              ? 'text-stone-100'
                              : 'text-stone-900'
                          }`}
                        >
                          {exam.courseCode}
                        </div>
                        {exam.courseTitle && (
                          <div
                            className={`mt-0.5 text-sm font-medium leading-snug ${
                              isCancelled
                                ? 'line-through opacity-80'
                                : isDark
                                ? 'text-stone-300'
                                : 'text-stone-600'
                            }`}
                          >
                            {exam.courseTitle}
                          </div>
                        )}
                      </div>

                      {/* 3. Bottom Location Line: Room Assignment */}
                      {!isCancelled && (
                        <div
                          className={`mt-2.5 pt-2 border-t text-xs font-medium font-sans tabular-nums ${
                            isDark
                              ? 'border-white/[0.06] text-stone-400'
                              : 'border-stone-200 text-stone-600'
                          }`}
                        >
                          {exam.room ? `Room ${exam.room}` : 'Room TBA'}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
