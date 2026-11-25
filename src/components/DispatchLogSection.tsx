import React, { useState } from 'react';
import { DispatchLogItem } from '../utils/deltaLogEngine';
import { formatTo12Hour } from '../utils/timeCalculations';
import { Radio, ChevronDown, Trash2, ShieldCheck, AlertOctagon, MapPin, FileText } from 'lucide-react';

interface DispatchLogSectionProps {
  logs: DispatchLogItem[];
  onClearLogs: () => void;
  theme?: 'light' | 'dark';
}

export const DispatchLogSection: React.FC<DispatchLogSectionProps> = ({
  logs,
  onClearLogs,
  theme = 'light',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const isDark = theme === 'dark';

  const getTypeBadge = (type: DispatchLogItem['type']) => {
    switch (type) {
      case 'CANCELLATION':
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold uppercase ${
              isDark
                ? 'bg-rose-950/60 text-rose-300 border border-rose-800/80'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <AlertOctagon className="w-3 h-3" />
            Cancellation
          </span>
        );
      case 'ROOM REALLOCATION':
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold uppercase ${
              isDark
                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/80'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            <MapPin className="w-3 h-3" />
            Venue Change
          </span>
        );
      case 'EXAM UPDATE':
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold uppercase ${
              isDark
                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/80'
                : 'bg-amber-50 text-amber-900 border border-amber-200'
            }`}
          >
            <FileText className="w-3 h-3" />
            Exam / CT
          </span>
        );
      case 'SYSTEM READY':
      default:
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold uppercase ${
              isDark
                ? 'bg-[#27272A] text-zinc-300 border border-[#3F3F46]'
                : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
            }`}
          >
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            Feed Update
          </span>
        );
    }
  };

  return (
    <div
      className={`mb-4 rounded-2xl border select-none transition-colors overflow-hidden ${
        isDark ? 'bg-[#18181B] border-[#3F3F46]' : 'bg-white border-[#E4E4E7]'
      }`}
    >
      {/* Collapsible Header */}
      <div
        className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors ${
          isOpen ? 'border-b ' + (isDark ? 'border-[#3F3F46]' : 'border-[#E4E4E7]') : ''
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
              isDark ? 'bg-white text-[#09090B]' : 'bg-[#09090B] text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
          </div>

          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span
              className={`text-xs font-bold font-sans tracking-wide uppercase truncate ${
                isDark ? 'text-[#FAFAFA]' : 'text-[#09090B]'
              }`}
            >
              Update Log
            </span>
            <span
              className={`text-[11px] font-sans font-medium px-2.5 py-0.5 rounded-full border ${
                isDark
                  ? 'bg-[#27272A] text-zinc-300 border-[#3F3F46]'
                  : 'bg-zinc-100 text-zinc-600 border-zinc-200'
              }`}
            >
              {logs.length} {logs.length === 1 ? 'Update' : 'Updates'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isOpen && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClearLogs();
              }}
              title="Clear differential dispatch history"
              className={`text-xs font-sans font-medium px-3 py-1 rounded-full flex items-center gap-1 cursor-pointer transition-colors border ${
                isDark
                  ? 'bg-[#27272A] text-zinc-300 hover:text-white border-[#3F3F46] hover:bg-[#3F3F46]'
                  : 'bg-zinc-50 text-zinc-700 hover:text-zinc-900 border-zinc-200 hover:bg-zinc-100'
              }`}
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}

          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform duration-200 ${
              isOpen ? 'rotate-180' : 'rotate-0'
            } ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}
          >
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Expanded Log Feed with fluid grid transition & wrapping */}
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-3.5 space-y-2">
            {logs.length === 0 ? (
              <div
                className={`py-3 text-center text-xs font-sans rounded-xl border ${
                  isDark
                    ? 'text-zinc-500 bg-[#27272A]/40 border-[#3F3F46]'
                    : 'text-zinc-400 bg-zinc-50 border-zinc-200'
                }`}
              >
                No differential dispatches logged yet
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 text-xs transition-colors ${
                    isDark
                      ? 'bg-[#27272A]/50 border-[#3F3F46]'
                      : 'bg-zinc-50/80 border-zinc-200'
                  }`}
                >
                  {/* Clean wrap on mobile (<640px) without horizontal blowouts */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-sans tabular-nums font-medium shrink-0 ${
                          isDark ? 'text-zinc-400' : 'text-zinc-500'
                        }`}
                      >
                        {formatTo12Hour(log.time)}
                      </span>
                      <div className="shrink-0">{getTypeBadge(log.type)}</div>
                    </div>
                    <span
                      className={`text-xs font-sans whitespace-normal break-words leading-relaxed min-w-0 ${
                        isDark ? 'text-zinc-200' : 'text-zinc-800'
                      }`}
                    >
                      {log.message}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
