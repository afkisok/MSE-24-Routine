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
  const trimmed = timeStr.trim();
  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return 0;

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3]?.toLowerCase();

  if (isNaN(hours) || isNaN(minutes)) return 0;

  if (meridiem === 'pm' && hours < 12) {
    hours += 12;
  } else if (meridiem === 'am' && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
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

export function computeDynamicDayEndMinutes(
  events: Array<{ startTime: string; endTime: string; status?: string; subject?: string }>
): number {
  let hasLateEvent = false;
  let latestEnd = DAY_END_MINUTES; // 17:00 (1020)

  for (const evt of events) {
    const status = (evt.status || '').trim().toLowerCase();
    if (status === 'cancelled' || status === 'canceled') continue;
    if (evt.subject !== undefined && !evt.subject.trim()) continue;

    const start = timeToMinutes(evt.startTime);
    const end = timeToMinutes(evt.endTime);
    const effectiveEnd = end > start ? end : start + 50;

    if (start >= DAY_END_MINUTES) {
      hasLateEvent = true;
      latestEnd = Math.max(latestEnd, 18 * 60, effectiveEnd);
    }
  }

  if (!hasLateEvent) {
    return DAY_END_MINUTES;
  }

  return Math.min(23 * 60 + 50, latestEnd);
}

export function calculateSlotGeometry(
  startTime: string,
  endTime: string,
  totalDayMinutes: number = TOTAL_DAY_MINUTES
): {
  leftPercent: number;
  widthPercent: number;
  durationMinutes: number;
} {
  const safeTotal = Math.max(TOTAL_DAY_MINUTES, totalDayMinutes);
  const startMins = timeToMinutes(startTime);
  const endMins = timeToMinutes(endTime);
  const duration = endMins > startMins ? endMins - startMins : 50;

  const leftPercent = ((startMins - DAY_START_MINUTES) / safeTotal) * 100;
  const widthPercent = (duration / safeTotal) * 100;

  return {
    leftPercent: Math.max(0, Math.min(100, leftPercent)),
    widthPercent: Math.max(1, Math.min(100 - leftPercent, widthPercent)),
    durationMinutes: duration,
  };
}

export function getAcademicPeriodMarkers(
  totalDayMinutes: number = TOTAL_DAY_MINUTES
): PeriodMarker[] {
  const safeTotal = Math.max(TOTAL_DAY_MINUTES, totalDayMinutes);
  const endMinutes = DAY_START_MINUTES + safeTotal;
  const markerTimes: string[] = [...ACADEMIC_PERIOD_TIMES];

  // Append hourly markers past 17:00 (e.g., 18:00, 19:00) if the timeline extends past 5:00 PM
  let lastMarkerMins = DAY_END_MINUTES;
  for (let mins = 18 * 60; mins <= endMinutes; mins += 60) {
    const hh = String(Math.floor(mins / 60)).padStart(2, '0');
    const mm = String(mins % 60).padStart(2, '0');
    markerTimes.push(`${hh}:${mm}`);
    lastMarkerMins = mins;
  }

  // If the dynamic end time extends at least 30 minutes past the last full hour, add a closing edge marker
  if (endMinutes > lastMarkerMins && endMinutes - lastMarkerMins >= 30) {
    const hh = String(Math.floor(endMinutes / 60)).padStart(2, '0');
    const mm = String(endMinutes % 60).padStart(2, '0');
    markerTimes.push(`${hh}:${mm}`);
  }

  return markerTimes.map((timeStr, idx) => {
    const mins = timeToMinutes(timeStr);
    const minutesFromStart = mins - DAY_START_MINUTES;
    const leftPercent = (minutesFromStart / safeTotal) * 100;

    return {
      timeStr,
      minutesFromMidnight: mins,
      minutesFromStart,
      leftPercent,
      isFirst: idx === 0,
      isLast: idx === markerTimes.length - 1,
    };
  });
}

export function getHourMarkers(totalDayMinutes: number = TOTAL_DAY_MINUTES): PeriodMarker[] {
  return getAcademicPeriodMarkers(totalDayMinutes);
}

export function formatDuration(durationMinutes: number): string {
  if (durationMinutes < 60) {
    return `${durationMinutes}M`;
  }
  const hrs = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;
  return mins > 0 ? `${hrs}H ${mins}M` : `${hrs}H`;
}
