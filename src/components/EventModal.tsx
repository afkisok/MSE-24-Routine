import React from 'react';
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
      <h2
        className={`text-lg sm:text-xl font-bold tracking-tight leading-snug mb-3 ${
          isCancelled
            ? 'line-through text-stone-500'
            : isDark
            ? 'text-stone-100'
            : 'text-stone-900'
        }`}
      >
        {event.subject}
      </h2>

      {/* Borderless Vertical Metadata List with 1px Dividers */}
      <div
        className={`flex flex-col divide-y mb-4 ${
          isDark ? 'divide-stone-800' : 'divide-stone-200'
        }`}
      >
        {/* SYLLABUS / REPORT DUE (first borderless row above TIME when notes exist) */}
        {syllabusLines.length > 0 && (
          <div className="py-3 first:pt-1">
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
          </div>
        )}

        {/* TIME & ROOM side-by-side 2-column grid */}
        <div className="py-3 first:pt-1 grid grid-cols-2 gap-4">
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
        </div>

        {/* FACULTY (omitted on Term Finals when not provided) */}
        {(!isTermFinal || Boolean((event.teacher || '').trim())) && (
          <div className="py-3">
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
          </div>
        )}
      </div>

      {/* Bottom action: Light secondary/ghost pill button ("Close") */}
      <div className="pt-1 pb-[env(safe-area-inset-bottom)] sm:pb-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={`w-full py-2.5 px-5 rounded-full cursor-pointer font-medium text-sm leading-tight transition-all duration-150 active:scale-95 border ${
            isDark
              ? 'bg-[#262523] text-[#F4F3EF] hover:bg-[#2F2E2B] border-transparent'
              : 'bg-[#EFEDE8] text-[#1C1B1A] hover:bg-[#E5E2DB] border-transparent'
          }`}
        >
          Close
        </button>
      </div>
    </BottomSheetModal>
  );
};
