import React from 'react';
import { motion } from 'motion/react';
import { RoutineAssignment } from '../types/routine';
import { BottomSheetModal } from './BottomSheetModal';

interface AssignmentsModalProps {
  assignments: RoutineAssignment[];
  onClose: () => void;
  theme?: 'light' | 'dark';
}

export const AssignmentsModal: React.FC<AssignmentsModalProps> = ({
  assignments,
  onClose,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';

  const cleanValue = (val?: string) => {
    const trimmed = (val || '').trim();
    if (!trimmed || trimmed === '-' || trimmed.toLowerCase() === 'n/a') return '';
    return trimmed;
  };

  return (
    <BottomSheetModal
      onClose={onClose}
      theme={theme}
      ariaLabel="Active Assignments"
      sheetClassName="p-5 sm:p-6 overflow-hidden"
      renderHeader={(grabHandle) => (
        <>
          {grabHandle}

          {/* Flat Uppercase Eyebrow */}
          <div
            className={`flex items-center justify-between pb-3 mb-2 border-b transition-colors ${
              isDark ? 'border-stone-800' : 'border-stone-200'
            }`}
          >
            <span
              className={`text-[11px] font-semibold uppercase tracking-wider ${
                isDark ? 'text-[#FAF9F6]' : 'text-[#141312]'
              }`}
            >
              Assignments
            </span>
          </div>
        </>
      )}
    >
      {/* Scrollable Assignments List */}
      <div
        data-modal-scrollable="true"
        className="overflow-y-auto no-scrollbar overscroll-y-contain pb-[env(safe-area-inset-bottom)] sm:pb-0 pr-0.5"
        onPointerDown={(e) => {
          if (e.currentTarget.scrollTop > 0) {
            e.stopPropagation();
          }
        }}
      >
        {assignments.length === 0 ? (
          <div
            className={`py-10 text-center text-sm font-sans ${
              isDark ? 'text-stone-400' : 'text-stone-500'
            }`}
          >
            No active assignments
          </div>
        ) : (
          <div
            className={`flex flex-col divide-y ${
              isDark ? 'divide-stone-800' : 'divide-stone-200'
            }`}
          >
            {assignments.map((item, idx) => {
              const syllabusLines = (item.syllabus || '')
                .trim()
                .split('\n')
                .map((s) => s.replace(/^[•\-\*▸]\s*/, '').trim())
                .filter((s) => s.length > 0);

              const teacher = cleanValue(item.teacher);
              const dueParts = Array.from(
                new Set([cleanValue(item.room), cleanValue(item.endTime)].filter(Boolean))
              );
              const metaParts = [teacher, ...dueParts].filter(Boolean);

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.24,
                    delay: Math.min(idx * 0.045, 0.2),
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="py-3.5 first:pt-2 last:pb-2"
                >
                  <h3
                    className={`text-sm sm:text-base font-bold tracking-tight leading-snug ${
                      isDark ? 'text-stone-100' : 'text-stone-900'
                    }`}
                  >
                    {item.subject}
                  </h3>

                  {syllabusLines.length > 0 && (
                    <div
                      className={`mt-1.5 text-sm font-normal leading-relaxed space-y-1 ${
                        isDark ? 'text-stone-300' : 'text-stone-700'
                      }`}
                    >
                      {syllabusLines.map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                  )}

                  {metaParts.length > 0 && (
                    <div
                      className={`mt-2 text-xs font-sans tabular-nums flex items-center gap-1.5 flex-wrap ${
                        isDark ? 'text-stone-400' : 'text-stone-500'
                      }`}
                    >
                      {metaParts.map((part, metaIdx) => (
                        <React.Fragment key={`${item.id}-meta-${metaIdx}`}>
                          {metaIdx > 0 && <span className="text-stone-400">·</span>}
                          <span>{part}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </BottomSheetModal>
  );
};
