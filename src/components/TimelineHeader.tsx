import React from 'react';
import { getAcademicPeriodMarkers, PeriodMarker } from '../utils/timeCalculations';

interface TimelineHeaderProps {
  currentMinuteOffset?: number | null;
}

export const TimelineHeader: React.FC<TimelineHeaderProps> = ({ currentMinuteOffset }) => {
  const markers: PeriodMarker[] = getAcademicPeriodMarkers();

  return (
    <div className="sticky top-0 z-20 bg-slate-100/80 border-b border-[#E2E8F0] pb-2 pt-1 select-none">
      <div className="relative h-8">
        {markers.map((marker) => {
          return (
            <div
              key={marker.timeStr}
              style={{ left: `${marker.leftPercent}%` }}
              className={`absolute top-0 flex flex-col items-center ${
                marker.isFirst
                  ? 'items-start -translate-x-0 pl-1'
                  : marker.isLast
                  ? 'items-end -translate-x-full pr-1'
                  : '-translate-x-1/2'
              }`}
            >
              {/* Fine 1px Tick Mark */}
              <div className="w-px h-2 bg-slate-300 mb-0.5" />
              {/* Hour Marker in Tabular Sans */}
              <span className="text-[10px] font-sans font-medium text-slate-600 whitespace-nowrap tabular-nums">
                {marker.timeStr}
              </span>
            </div>
          );
        })}

        {/* Live System Time Cursor */}
        {currentMinuteOffset !== undefined &&
          currentMinuteOffset !== null &&
          currentMinuteOffset >= 0 &&
          currentMinuteOffset <= 540 && (
            <div
              style={{ left: `${(currentMinuteOffset / 540) * 100}%` }}
              className="absolute top-0 bottom-0 -translate-x-1/2 flex flex-col items-center pointer-events-none z-30"
            >
              <div className="px-1.5 py-0.2 rounded-2xs bg-[#0F172A] text-white text-[9px] font-sans font-semibold tracking-normal shadow-xs uppercase">
                Now
              </div>
              <div className="w-0.5 h-full bg-[#0F172A]" />
            </div>
          )}
      </div>
    </div>
  );
};
