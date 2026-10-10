import React, { useEffect } from 'react';
import { RoutineEvent } from '../types/routine';
import { formatTo12Hour } from '../utils/timeCalculations';
import { parseAlternatingSchedule } from '../utils/alternatingLabEngine';
import { Clock, MapPin, User, X, AlertOctagon, BookOpen, Calendar, FileText, Users, ClipboardCheck } from 'lucide-react';

interface EventModalProps {
  event: RoutineEvent | null;
  onClose: () => void;
  theme?: 'light' | 'dark';
}

export const EventModal: React.FC<EventModalProps> = ({ event, onClose, theme = 'light' }) => {
  const isDark = theme === 'dark';

  // Robust scroll lock cleanup strictly adhering to the specified pattern
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!event) return null;

  const alternating = parseAlternatingSchedule(event.type, event.subject, event.syllabus);
  const isExam = alternating.category === 'EXAM';
  const isLab = alternating.category === 'LAB';
  const isCancelled = event.status === 'Cancelled';

  // Raw syllabus string retained across all event types
  const rawSyllabus = (event.syllabus || '').trim();
  const syllabusLines = rawSyllabus
    ? rawSyllabus
        .split('\n')
        .map((s) => s.replace(/^[•\-\*]\s*/, '').trim())
        .filter((s) => s.length > 0)
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative w-full max-w-lg rounded-t-[28px] sm:rounded-[28px] p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto border transform-gpu ${
          isDark
            ? 'bg-[#18181B] border-[#27272A] text-[#F4F4F5]'
            : 'bg-white border-[#E2E8F0] text-[#0F172A]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Centered Horizontal Drag-Pill Handle (One UI signature element) */}
        <div className="flex justify-center -mt-1 mb-3 pt-1">
          <div
            className={`w-12 h-1.5 rounded-full transition-colors ${
              isDark ? 'bg-zinc-700' : 'bg-zinc-300'
            }`}
          />
        </div>

        {/* Top Header Strip: Metadata Badges & Circular Close Control */}
        <div
          className={`flex items-center justify-between pb-3.5 mb-3.5 border-b transition-colors ${
            isDark ? 'border-[#27272A]' : 'border-[#E2E8F0]'
          }`}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-[11px] font-medium px-3 py-0.5 rounded-full border uppercase tracking-wide ${
                isExam
                  ? isDark
                    ? 'bg-amber-950/70 text-amber-300 border-amber-800'
                    : 'bg-amber-100 text-amber-800 border-amber-200'
                  : isLab
                  ? isDark
                    ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800'
                    : 'bg-emerald-100 text-[#064E3B] border-emerald-200'
                  : isDark
                  ? 'bg-[#27272A] text-[#D4D4D8] border-[#3F3F46]'
                  : 'bg-slate-100 text-[#0F172A] border-slate-300'
              }`}
            >
              {isLab ? 'Lab' : isExam ? 'Exam' : 'Lecture'}
            </span>

            {/* Explicit Group Badge in Modal Header */}
            {alternating.groupTag && !isCancelled && (
              <span
                className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border uppercase tracking-wide ${
                  isDark
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/70'
                    : 'bg-emerald-50 text-[#064E3B] border-emerald-300'
                }`}
              >
                {alternating.groupTag}
              </span>
            )}

            {/* Fallback REPORT DUE badge for LAB when syllabus is empty but marked as report due */}
            {isLab && !isCancelled && rawSyllabus.length === 0 && alternating.hasReportDue && (
              <span
                className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border uppercase tracking-wide ${
                  isDark
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                    : 'bg-emerald-100 text-[#064E3B] border-emerald-300'
                }`}
              >
                Report Due
              </span>
            )}

            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                isDark
                  ? 'text-[#A1A1AA] bg-[#27272A] border-[#3F3F46]'
                  : 'text-slate-600 bg-slate-100 border-slate-200'
              }`}
            >
              <Calendar className="w-3 h-3 text-[#A1A1AA]" />
              {event.day}
            </span>

            {isCancelled && (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                  isDark
                    ? 'bg-rose-950/60 text-rose-300 border-rose-900/60'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                <AlertOctagon className="w-3 h-3" />
                Cancelled
              </span>
            )}
          </div>

          {/* Clean Circular Close Button (One UI design) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-150 active:scale-95 cursor-pointer border ${
              isDark
                ? 'bg-[#27272A] hover:bg-[#3F3F46] text-[#A1A1AA] hover:text-[#F4F4F5] border-[#3F3F46]/60'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-slate-200'
            }`}
            aria-label="Close details dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Course Title */}
        <h2
          className={`text-lg sm:text-xl font-bold tracking-tight leading-snug mb-3 ${
            isCancelled
              ? 'line-through text-slate-500'
              : isDark
              ? 'text-[#F4F4F5]'
              : 'text-[#0F172A]'
          }`}
        >
          {event.subject}
        </h2>

        {/* Cancellation Notice Banner */}
        {isCancelled && (
          <div
            className={`mb-3 p-3.5 rounded-[16px] text-xs flex items-start gap-2.5 border ${
              isDark
                ? 'bg-rose-950/20 border-rose-900/40 text-rose-200'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <div>
              <p className="font-bold uppercase tracking-wide">
                Notice: Class Cancelled
              </p>
              <p className="text-[11px] mt-0.5 leading-relaxed opacity-90">
                This class period has been officially cancelled by administration. No attendance required for this period.
              </p>
            </div>
          </div>
        )}

        {/* CATEGORY 'EXAM': ASSESSMENT CRITERIA & SYLLABUS SUB-CARD (border-radius: 16px) */}
        {isExam && (
          <div
            className={`mb-3 rounded-[16px] overflow-hidden border ${
              isDark
                ? 'border-amber-500/60 bg-[#78350F]/15'
                : 'border-[#D97706]/60 bg-amber-50/70'
            }`}
          >
            <div
              className={`px-3.5 py-2 flex items-center justify-between text-xs font-bold tracking-wider uppercase border-b ${
                isDark
                  ? 'bg-[#B45309] text-amber-50 border-amber-600/50'
                  : 'bg-[#D97706] text-white border-amber-700'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-200" />
                Exam / Class Test (CT) Session
              </span>
              <span className="text-[11px] opacity-90 font-mono">
                {event.marks || 'Assessment'}
              </span>
            </div>

            <div className="p-3.5">
              <div
                className={`flex items-center gap-1.5 text-xs font-bold uppercase mb-2 ${
                  isDark ? 'text-amber-300' : 'text-[#78350F]'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Assessment Criteria & Syllabus</span>
              </div>
              {syllabusLines.length > 0 ? (
                <ul
                  className={`space-y-1.5 text-xs ${
                    isDark ? 'text-[#F4F4F5]' : 'text-slate-700'
                  }`}
                >
                  {syllabusLines.map((line, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-amber-500 font-bold">•</span>
                      <span className="leading-relaxed">{line}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={`text-xs italic ${isDark ? 'text-[#A1A1AA]' : 'text-slate-500'}`}>
                  No specific syllabus topics appended
                </p>
              )}
            </div>
          </div>
        )}

        {/* CATEGORY 'LAB': DELIVERABLE / SUBMISSION SUB-CARD (border-radius: 16px) */}
        {isLab && rawSyllabus.length > 0 && (
          <div
            className={`mb-3 rounded-[16px] overflow-hidden border ${
              isDark
                ? 'border-emerald-600/60 bg-emerald-950/20'
                : 'border-emerald-300 bg-emerald-50/70'
            }`}
          >
            <div
              className={`px-3.5 py-2 flex items-center justify-between text-xs font-bold tracking-wider uppercase border-b ${
                isDark
                  ? 'bg-emerald-900 text-emerald-100 border-emerald-800'
                  : 'bg-emerald-700 text-white border-emerald-800'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <ClipboardCheck className="w-3.5 h-3.5 text-emerald-200" />
                <span>Deliverable / Submission</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-800 text-emerald-100 uppercase border border-emerald-600/50">
                {alternating.groupTag ? `${alternating.groupTag} Due` : 'Submission Due'}
              </span>
            </div>

            <div className="p-3.5">
              <div
                className={`flex items-center gap-1.5 text-xs font-bold uppercase mb-1.5 ${
                  isDark ? 'text-emerald-300' : 'text-[#064E3B]'
                }`}
              >
                <span>Scheduled Lab Deliverable:</span>
              </div>
              <ul
                className={`space-y-1.5 text-xs ${
                  isDark ? 'text-[#F4F4F5]' : 'text-slate-800'
                }`}
              >
                {syllabusLines.map((line, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">▸</span>
                    <span className="leading-relaxed font-medium">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* CATEGORY 'LECTURE': TOPICS / SYLLABUS ONLY IF CONTENT EXISTS (border-radius: 16px) */}
        {!isExam && !isLab && rawSyllabus.length > 0 && (
          <div
            className={`mb-3 rounded-[16px] overflow-hidden border ${
              isDark
                ? 'border-[#27272A] bg-[#121212]'
                : 'border-slate-300 bg-slate-50'
            }`}
          >
            <div
              className={`px-3.5 py-2 flex items-center justify-between text-xs font-bold tracking-wider uppercase border-b ${
                isDark
                  ? 'bg-[#27272A] text-[#F4F4F5] border-[#27272A]'
                  : 'bg-slate-200 text-slate-800 border-slate-300'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                <span>Topics / Syllabus</span>
              </span>
            </div>

            <div className="p-3.5">
              <ul
                className={`space-y-1.5 text-xs ${
                  isDark ? 'text-[#F4F4F5]' : 'text-slate-800'
                }`}
              >
                {syllabusLines.map((line, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-slate-400 font-bold">•</span>
                    <span className="leading-relaxed">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Operational Metadata Grid: Sub-cards with border-radius: 16px */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
          {/* "Time" Block */}
          <div
            className={`rounded-[16px] p-3.5 border transition-colors ${
              isDark
                ? 'bg-[#121212] border-[#27272A]'
                : 'bg-slate-50 border-[#E2E8F0]'
            }`}
          >
            <div
              className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase ${
                isDark ? 'text-[#A1A1AA]' : 'text-slate-500'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Time</span>
            </div>
            <div
              className={`text-sm font-semibold mt-1 font-sans tabular-nums ${
                isDark ? 'text-[#F4F4F5]' : 'text-[#0F172A]'
              }`}
            >
              {formatTo12Hour(event.startTime)} – {formatTo12Hour(event.endTime)}
            </div>
          </div>

          {/* "Room" Block */}
          <div
            className={`rounded-[16px] p-3.5 border transition-colors ${
              isDark
                ? 'bg-[#121212] border-[#27272A]'
                : 'bg-slate-50 border-[#E2E8F0]'
            }`}
          >
            <div
              className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase ${
                isDark ? 'text-[#A1A1AA]' : 'text-slate-500'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-500" />
              <span>Room</span>
            </div>
            <div
              className={`text-sm font-semibold mt-1 font-sans truncate ${
                isDark ? 'text-[#F4F4F5]' : 'text-[#0F172A]'
              }`}
            >
              {event.room || 'Room TBA'}
            </div>
          </div>

          {/* "Faculty" Block */}
          <div
            className={`rounded-[16px] p-3.5 sm:col-span-2 border transition-colors ${
              isDark
                ? 'bg-[#121212] border-[#27272A]'
                : 'bg-slate-50 border-[#E2E8F0]'
            }`}
          >
            <div
              className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase ${
                isDark ? 'text-[#A1A1AA]' : 'text-slate-500'
              }`}
            >
              <User className="w-3.5 h-3.5 text-blue-400" />
              <span>Faculty</span>
            </div>
            <div className={`text-sm font-bold mt-1 ${isDark ? 'text-[#F4F4F5]' : 'text-[#0F172A]'}`}>
              {event.teacher || 'Not designated'}
            </div>
          </div>

          {/* Lab Group Designation Block */}
          {alternating.category === 'LAB' && (
            <div
              className={`rounded-[16px] p-3.5 sm:col-span-2 border transition-colors ${
                isDark
                  ? 'bg-[#121212] border-[#27272A]'
                  : 'bg-emerald-50/40 border-emerald-200'
              }`}
            >
              <div
                className={`flex items-center justify-between text-[11px] font-semibold uppercase ${
                  isDark ? 'text-emerald-300' : 'text-[#064E3B]'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>Assigned Lab Group</span>
                </span>
                {alternating.groupTag ? (
                  <span
                    className={`font-semibold px-2.5 py-0.5 rounded-full border text-[10px] uppercase ${
                      isDark
                        ? 'bg-[#18181B] text-emerald-300 border-emerald-600/70'
                        : 'bg-emerald-100 text-[#064E3B] border-emerald-300'
                    }`}
                  >
                    {alternating.groupTag}
                  </span>
                ) : (
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full border ${
                      isDark
                        ? 'bg-[#18181B] text-[#A1A1AA] border-[#27272A]'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    All Groups
                  </span>
                )}
              </div>
              <div
                className={`text-sm font-bold mt-1.5 ${
                  isDark ? 'text-[#F4F4F5]' : 'text-[#0F172A]'
                }`}
              >
                {alternating.groupTag === 'GRP A'
                  ? 'Group A Only (Sessional Attendance)'
                  : alternating.groupTag === 'GRP B'
                  ? 'Group B Only (Sessional Attendance)'
                  : alternating.groupTag === 'GRP A/B'
                  ? 'Dual Group (Group A & Group B Dual Attendance)'
                  : 'Full Batch Laboratory Sessional (Combined Attendance)'}
              </div>
            </div>
          )}
        </div>

        {/* Bottom action: Full-width, pill-shaped primary button ("Close Details") with border-radius: 9999px */}
        <div className="pt-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className={`w-full py-3 px-6 rounded-full cursor-pointer font-medium text-sm transition-all duration-150 active:scale-95 shadow-sm border ${
              isDark
                ? 'bg-[#F4F4F5] text-[#18181B] hover:bg-white border-[#F4F4F5]'
                : 'bg-[#0F172A] text-white hover:bg-slate-800 border-[#0F172A]'
            }`}
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
