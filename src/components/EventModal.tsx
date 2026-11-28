import React from 'react';
import { motion } from 'motion/react';
import { RoutineEvent } from '../types/routine';
import { formatTo12Hour } from '../utils/timeCalculations';
import { parseAlternatingSchedule } from '../utils/alternatingLabEngine';
import { BottomSheetModal } from './BottomSheetModal';

interface EventModalProps {
  event: RoutineEvent | null;
  onClose: () => void;
  theme?: 'light' | 'dark';
}

export const EventModal: React.FC<EventModalProps> = ({ event, onClose, theme = 'light' }) => {
  const isDark = theme === 'dark';

  if (!event) return null;

  const alternating = parseAlternatingSchedule(event.type, event.subject, event.syllabus);
  const isTermFinal = (event.type || '').trim().toLowerCase() === 'tf';
  const isExam = alternating.category === 'EXAM' || isTermFinal;
  const isLab = alternating.category === 'LAB';
  const isCancelled = event.status === 'Cancelled';

  // Raw syllabus string retained across all event types
  const rawSyllabus = (event.syllabus || '').trim();
  const syllabusLines = rawSyllabus
    ? rawSyllabus
        .split('\n')
        .map((s) => s.replace(/^[•\-\*▸]\s*/, '').trim())
        .filter((s) => s.length > 0)
    : [];

  // Flat uppercase marks display for top eyebrow line (e.g., "10 MARKS")
  const rawMarks = (event.marks || '').trim();
  const marksEyebrowText = rawMarks
    ? /mark/i.test(rawMarks)
      ? rawMarks
      : `${rawMarks} Marks`
    : '';

  return (
    <BottomSheetModal
      onClose={onClose}
      theme={theme}
      sheetClassName="p-5 sm:p-6 overflow-y-auto no-scrollbar"
      renderHeader={(grabHandle) => (
        <>
          {grabHandle}

          {/* Top Header Strip: Natural Human Phrasing in Uppercase Micro-Tracking */}
          <div
            className={`pb-3 mb-3.5 border-b transition-colors ${
              isDark ? 'border-stone-800' : 'border-stone-200'
            }`}
          >
            <div
              className={`text-[11px] font-semibold uppercase tracking-wider leading-snug ${
                isDark ? 'text-stone-400' : 'text-stone-500'
              }`}
            >
              <span>
                {isTermFinal ? 'Term Final' : isLab ? 'Lab' : isExam ? 'Exam' : 'Lecture'}
              </span>
              {(() => {
                const groupPhrase =
                  alternating.groupVariant === 'A' || alternating.groupTag === 'GRP A'
                    ? 'Group A'
                    : alternating.groupVariant === 'B' || alternating.groupTag === 'GRP B'
                    ? 'Group B'
                    : alternating.groupTag === 'GRP A/B'
                    ? 'Group A & B'
                    : null;

                if (!groupPhrase) return null;
                return (
                  <>
                    <span> for </span>
                    <span className="text-[#9E2C2C]">{groupPhrase}</span>
                  </>
                );
              })()}
              <span>{` on ${event.dateLabel || event.day}`}</span>
              {marksEyebrowText && (
                <span className="tabular-nums">{`, for ${marksEyebrowText}`}</span>
              )}
              {isCancelled && <span>, Canceled</span>}
            </div>
          </div>
        </>
      )}
    >
      {/* Course Title */}
      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, delay: 0.04, ease: [0.22, 1, 0.36, 1] }}
        className={`text-lg sm:text-xl font-bold tracking-tight leading-snug mb-3 ${
          isCancelled
            ? 'line-through text-stone-500'
            : isDark
            ? 'text-stone-100'
            : 'text-stone-900'
        }`}
      >
        {event.subject}
      </motion.h2>

      {/* Borderless Vertical Metadata List with 1px Dividers */}
      <div
        className={`flex flex-col divide-y pb-[env(safe-area-inset-bottom)] sm:pb-0 ${
          isDark ? 'divide-stone-800' : 'divide-stone-200'
        }`}
      >
        {/* SYLLABUS / REPORT DUE (first borderless row above TIME when notes exist) */}
        {syllabusLines.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="py-3 first:pt-1"
          >
            <div
              className={`text-[11px] font-semibold uppercase tracking-wider ${
                isDark ? 'text-stone-400' : 'text-stone-500'
              }`}
            >
              {isLab ? 'Report Due' : 'Syllabus'}
            </div>
            <div
              className={`text-sm font-medium mt-1 leading-relaxed space-y-1 ${
                isDark ? 'text-stone-100' : 'text-stone-900'
              }`}
            >
              {syllabusLines.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </motion.div>
        )}

        {/* TIME & ROOM side-by-side 2-column grid */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: syllabusLines.length > 0 ? 0.12 : 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="py-3 first:pt-1 grid grid-cols-2 gap-4"
        >
          <div className="min-w-0">
            <div
              className={`text-[11px] font-semibold uppercase tracking-wider ${
                isDark ? 'text-stone-400' : 'text-stone-500'
              }`}
            >
              Time
            </div>
            <div
              className={`text-sm font-semibold mt-1 font-sans tabular-nums ${
                isDark ? 'text-stone-100' : 'text-stone-900'
              }`}
            >
              {formatTo12Hour(event.startTime)} – {formatTo12Hour(event.endTime)}
            </div>
          </div>

          <div className="min-w-0">
            <div
              className={`text-[11px] font-semibold uppercase tracking-wider ${
                isDark ? 'text-stone-400' : 'text-stone-500'
              }`}
            >
              Room
            </div>
            <div
              className={`text-sm font-semibold mt-1 font-sans ${
                isDark ? 'text-stone-100' : 'text-stone-900'
              }`}
            >
              {event.room || 'Room TBA'}
            </div>
          </div>
        </motion.div>

        {/* FACULTY (omitted on Term Finals when not provided) */}
        {(!isTermFinal || Boolean((event.teacher || '').trim())) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: syllabusLines.length > 0 ? 0.16 : 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="py-3"
          >
            <div
              className={`text-[11px] font-semibold uppercase tracking-wider ${
                isDark ? 'text-stone-400' : 'text-stone-500'
              }`}
            >
              Faculty
            </div>
            <div className={`text-sm font-semibold mt-1 ${isDark ? 'text-stone-100' : 'text-stone-900'}`}>
              {event.teacher || 'Not designated'}
            </div>
          </motion.div>
        )}
      </div>
    </BottomSheetModal>
  );
};
