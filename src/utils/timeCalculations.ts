export const DAY_START_MINUTES = 480; // 08:00 AM
export const DAY_END_MINUTES = 1020;   // 05:00 PM
export const TOTAL_DAY_MINUTES = 540;   // 1020 - 480

/**
 * Academic Period Start Times:
 * 08:00, 08:50, 09:40, 10:40, 11:30, 12:20, 13:10, 14:30, 15:20, 16:10, 17:00
 */
export const ACADEMIC_PERIOD_TIMES = [
  '08:00',
  '08:50',
  '09:40',
  '10:40',
  '11:30',
  '12:20',
  '13:10',
  '14:30',
  '15:20',
  '16:10',
  '17:00',
] as const;

export interface PeriodMarker {
  timeStr: string;
  minutesFromMidnight: number;
  minutesFromStart: number;
  leftPercent: number;
  isFirst: boolean;
  isLast: boolean;
}

export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return 0;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  return (isNaN(hours) ? 0 : hours * 60) + (isNaN(minutes) ? 0 : minutes);
}

export function formatMinutesTo12Hour(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const displayMins = mins < 10 ? `0${mins}` : `${mins}`;
  return `${displayHours}:${displayMins} ${period}`;
}

export function formatTo12Hour(timeStr: string): string {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();

  // If already contains AM or PM
  if (/am|pm/i.test(trimmed)) {
    return trimmed;
  }

  // Handle range strings with spaces or en-dash: "14:30 - 17:00", "14:30 – 17:00", etc.
  if (trimmed.includes(' - ') || trimmed.includes(' – ') || trimmed.includes(' — ') || /\s+to\s+/i.test(trimmed)) {
    const parts = trimmed.split(/\s*(?:[-–—]|\bto\b)\s*/i);
    if (parts.length === 2) {
      return `${formatTo12Hour(parts[0])} – ${formatTo12Hour(parts[1])}`;
    }
  }

  // Handle compact range strings: "14:30-17:00"
  const rangeMatch = trimmed.match(/^(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})$/);
  if (rangeMatch) {
    return `${formatTo12Hour(rangeMatch[1])} – ${formatTo12Hour(rangeMatch[2])}`;
  }

  // Parse "HH:MM" or "H:MM"
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return trimmed;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (isNaN(hours) || isNaN(minutes)) return trimmed;

  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const displayMins = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${displayHours}:${displayMins} ${period}`;
}

export function formatTimeTo12Hour(timeStr: string): string {
  return formatTo12Hour(timeStr);
}

export function calculateSlotGeometry(startTime: string, endTime: string): {
  leftPercent: number;
  widthPercent: number;
  durationMinutes: number;
} {
  const startMins = timeToMinutes(startTime);
  const endMins = timeToMinutes(endTime);
  const duration = Math.max(0, endMins - startMins);

  const leftPercent = ((startMins - DAY_START_MINUTES) / TOTAL_DAY_MINUTES) * 100;
  const widthPercent = (duration / TOTAL_DAY_MINUTES) * 100;

  return {
    leftPercent: Math.max(0, Math.min(100, leftPercent)),
    widthPercent: Math.max(1, Math.min(100 - leftPercent, widthPercent)),
    durationMinutes: duration,
  };
}

export function getAcademicPeriodMarkers(): PeriodMarker[] {
  return ACADEMIC_PERIOD_TIMES.map((timeStr, idx) => {
    const mins = timeToMinutes(timeStr);
    const minutesFromStart = mins - DAY_START_MINUTES;
    const leftPercent = (minutesFromStart / TOTAL_DAY_MINUTES) * 100;

    return {
      timeStr,
      minutesFromMidnight: mins,
      minutesFromStart,
      leftPercent,
      isFirst: idx === 0,
      isLast: idx === ACADEMIC_PERIOD_TIMES.length - 1,
    };
  });
}

export function getHourMarkers(): PeriodMarker[] {
  return getAcademicPeriodMarkers();
}

export function formatDuration(durationMinutes: number): string {
  if (durationMinutes < 60) {
    return `${durationMinutes}M`;
  }
  const hrs = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;
  return mins > 0 ? `${hrs}H ${mins}M` : `${hrs}H`;
}
