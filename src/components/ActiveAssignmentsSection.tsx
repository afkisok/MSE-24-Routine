import React from 'react';
import { AssignmentItem } from '../types/routine';

interface ActiveAssignmentsSectionProps {
  assignments: AssignmentItem[];
}

export const ActiveAssignmentsSection: React.FC<ActiveAssignmentsSectionProps> = ({
  assignments,
}) => {
  return (
    <section className="mt-8 border-t border-[#222222] pt-6 select-none">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-[#A855F7] uppercase mb-1">
            <span className="w-2 h-2 bg-[#A855F7] inline-block animate-pulse" />
            <span>// COURSEWORK_TRACKER // DUE_QUEUE</span>
          </div>
          <h2 className="text-lg sm:text-2xl font-syne font-extrabold tracking-tight text-white uppercase leading-none">
            [ACTIVE_ASSIGNMENTS_CRITICAL]
          </h2>
        </div>
        <div className="text-[10px] font-mono text-[#888888] uppercase tracking-wider">
          ACTIVE_TASKS: [{assignments.length}]
        </div>
      </div>

      <div className="border border-[#A855F7]/40 bg-black divide-y divide-[#1A1A1A]">
        {assignments.length === 0 ? (
          <div className="p-6 text-center text-xs font-mono text-[#555555]">
            [ NO ACTIVE ASSIGNMENTS SUBMITTED ]
          </div>
        ) : (
          assignments.map((task, index) => (
            <div
              key={task.id || index}
              className="p-4 flex flex-col gap-2 hover:bg-[#0A0A0A] transition-none border-l-4 border-l-[#A855F7]"
            >
              {/* Task Header: Day & Subject */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[#A855F7] font-bold text-xs">◆</span>
                  <span className="text-xs sm:text-sm font-syne font-bold uppercase text-white tracking-tight">
                    {task.subject}
                  </span>
                  <span className="bg-[#A855F7]/20 border border-[#A855F7]/60 text-[#D8B4FE] text-[9px] font-mono font-bold px-1.5 py-0.5 uppercase tracking-wider">
                    DUE: {task.day.toUpperCase()}
                  </span>
                </div>

                <div className="text-[10px] font-mono font-bold text-[#A855F7] uppercase">
                  WEIGHT: {task.marks_weight}
                </div>
              </div>

              {/* Task Title */}
              <div className="text-xs font-mono font-bold text-[#E9D5FF] uppercase tracking-wide pl-4">
                TITLE: {task.title}
              </div>

              {/* Task Guidelines / Details */}
              <div className="text-[11px] font-mono text-[#888888] leading-relaxed pl-4 border-l border-[#262626] ml-4 mt-0.5">
                GUIDELINES: {task.task_details}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
