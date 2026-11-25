import React from 'react';
import { ChangeLogItem } from '../types/routine';

interface ChangeLogSectionProps {
  logs: ChangeLogItem[];
}

export const ChangeLogSection: React.FC<ChangeLogSectionProps> = ({ logs }) => {
  return (
    <section className="mt-10 border-t border-[#222222] pt-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-4">
        <div>
          <div className="text-[10px] font-mono text-[#666666] tracking-widest uppercase mb-1">
            // AUDIT_TRAIL // REALTIME_DISPATCH
          </div>
          <h2 className="text-lg sm:text-2xl font-syne font-extrabold tracking-tight text-white uppercase leading-none">
            SCHEDULE CHANGE LOGS
          </h2>
        </div>
        <div className="text-[10px] font-mono text-[#888888] uppercase tracking-wider">
          TOTAL_COMMITS: [{logs.length}]
        </div>
      </div>

      <div className="border border-[#222222] bg-black divide-y divide-[#1A1A1A]">
        {logs.length === 0 ? (
          <div className="p-6 text-center text-xs font-mono text-[#555555]">
            [ NO DISPATCH UPDATES RECORDED ]
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={log.id || index}
              className="p-3.5 sm:px-4 flex items-start gap-3 text-xs font-mono hover:bg-[#0A0A0A] transition-none"
            >
              <span className="text-[#00FF66] font-bold shrink-0 mt-0.5">❯</span>
              <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="text-[#777777] font-bold shrink-0 tracking-wider">
                  [{log.timestamp}]
                </span>
                <span className="text-white leading-relaxed">{log.text}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
