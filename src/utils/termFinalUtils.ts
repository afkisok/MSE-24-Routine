import { RoutineEvent, TermFinalExam } from '../types/routine';
import { timeToMinutes } from './timeCalculations';

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const WEEKDAYS_LONG: Array<TermFinalExam['weekdayLong']> = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

export interface ParsedExamDate {
  dateISO: string;
  displayDate: string;
  weekdayShort: string;
  weekdayLong: TermFinalExam['weekdayLong'];
}

function buildParsedDate(year: number, monthIndex: number, day: number): ParsedExamDate | null {
  if (monthIndex < 0 || monthIndex > 11 || day < 1 || day > 31) return null;
  const dt = new Date(year, monthIndex, day);
  // Guard against rolled-over invalid calendar dates (e.g. Feb 30)
  if (dt.getFullYear() !== year || dt.getMonth() !== monthIndex || dt.getDate() !== day) {
    return null;
  }

  const mm = String(monthIndex + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const weekdayIdx = dt.getDay();

  return {
    dateISO: `${year}-${mm}-${dd}`,
    displayDate: `${MONTH_NAMES_SHORT[monthIndex]} ${day}`,
    weekdayShort: WEEKDAYS_SHORT[weekdayIdx],
    weekdayLong: WEEKDAYS_LONG[weekdayIdx],
  };
}

/**
 * Infers the calendar year when a sheet omits the year (e.g. "Dec 12" or "Jan 5").
 * Prefers the earliest occurrence that is either upcoming or within the past 45 days
 * (so recently finished exams in the current term stay completed while future exams
 * several months away never resolve to the previous year).
 */
function inferYear(monthIndex: number, day: number, referenceDate: Date): number {
  const baseYear = referenceDate.getFullYear();
  const refMidday = new Date(
    baseYear,
    referenceDate.getMonth(),
    referenceDate.getDate(),
    12,
    0,
    0
  ).getTime();

  const candidates = [baseYear - 1, baseYear, baseYear + 1];
  for (const yr of candidates) {
    const dt = new Date(yr, monthIndex, day, 12, 0, 0);
    if (dt.getMonth() !== monthIndex || dt.getDate() !== day) continue;
    const diffDays = Math.round((dt.getTime() - refMidday) / 86400000);
    if (diffDays >= -45) {
      return yr;
    }
  }

  return baseYear + 1;
}

/**
 * Parses flexible exam date strings from the Day column:
 * - Strips leading weekday prefixes (e.g. "Sun, ", "Sunday, ", "Thu ")
 * - ISO: "2026-12-12" / "2026/12/12" / "2026-12-12T..."
 * - Month-name: "Dec 12" / "December 12" / "Dec 12, 2026" / "12 Dec" / "12-Dec-2026"
 * - Explicit DD/MM/YYYY (always treating slash- or hyphen-separated numeric dates as DD/MM/YYYY)
 * - Standard JS Date strings (e.g. "Sun Nov 29 2026 00:00:00 GMT+0600")
 */
export function parseExamDate(
  rawDate: string,
  referenceDate: Date = new Date()
): ParsedExamDate | null {
  const original = (rawDate || '').trim();
  if (!original) return null;

  // Strip leading weekday prefixes such as "Sun, ", "Sunday, ", "Thu - "
  const withoutWeekday = original
    .replace(
      /^(?:sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?)\.?\s*[,:-]?\s+/i,
      ''
    )
    .trim();

  const cleaned = withoutWeekday.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;

  // 1. ISO YYYY-MM-DD, YYYY/MM/DD, or ISO timestamp prefix YYYY-MM-DDT...
  const isoMatch = cleaned.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s].*)?$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    return buildParsedDate(year, month, day);
  }

  // 2. Named month first: "Dec 12", "Dec. 12, 2026", "December 12 2026", "Dec-12-2026",
  //    or JS Date string head like "Dec 12 2026 00:00:00 GMT+0600"
  const monthFirstMatch = cleaned.match(
    /^([a-zA-Z]+)\.?(?:[\s\-/]+)(\d{1,2})(?:st|nd|rd|th)?(?:(?:[\s\-/]+)(\d{2,4})(?:\s+\d{1,2}:\d{2}.*)?)?$/
  );
  if (monthFirstMatch) {
    const monthIdx = MONTH_MAP[monthFirstMatch[1].toLowerCase()];
    if (monthIdx !== undefined) {
      const day = parseInt(monthFirstMatch[2], 10);
      let year = monthFirstMatch[3]
        ? parseInt(monthFirstMatch[3], 10)
        : inferYear(monthIdx, day, referenceDate);
      if (year < 100) year += 2000;
      return buildParsedDate(year, monthIdx, day);
    }
  }

  // 3. Day first with named month: "12 Dec", "12-Dec-2026", "12 December 2026"
  const dayFirstMatch = cleaned.match(
    /^(\d{1,2})(?:st|nd|rd|th)?(?:[\s\-/]+)([a-zA-Z]+)\.?(?:(?:[\s\-/]+)(\d{2,4})(?:\s+\d{1,2}:\d{2}.*)?)?$/
  );
  if (dayFirstMatch) {
    const monthIdx = MONTH_MAP[dayFirstMatch[2].toLowerCase()];
    if (monthIdx !== undefined) {
      const day = parseInt(dayFirstMatch[1], 10);
      let year = dayFirstMatch[3]
        ? parseInt(dayFirstMatch[3], 10)
        : inferYear(monthIdx, day, referenceDate);
      if (year < 100) year += 2000;
      return buildParsedDate(year, monthIdx, day);
    }
  }

  // 4. Explicit numeric DD/MM/YYYY, DD/MM/YY, DD/MM, or DD-MM-YYYY (always DD/MM)
  const numericMatch = cleaned.match(/^(\d{1,2})[-/](\d{1,2})(?:[-/](\d{2,4}))?$/);
  if (numericMatch) {
    const day = parseInt(numericMatch[1], 10);
    const monthIdx = parseInt(numericMatch[2], 10) - 1;
    let year = numericMatch[3]
      ? parseInt(numericMatch[3], 10)
      : inferYear(monthIdx, day, referenceDate);
    if (year < 100) year += 2000;
    return buildParsedDate(year, monthIdx, day);
  }

  // 5. Fallback for any other standard JS Date strings
  // Avoid passing pure slash-separated numeric strings here so US MM/DD parsing never overrides DD/MM.
  if (!/^\d{1,2}[/-]\d{1,2}/.test(cleaned)) {
    const parsedFromOriginal = new Date(original);
    if (!Number.isNaN(parsedFromOriginal.getTime())) {
      return buildParsedDate(
        parsedFromOriginal.getFullYear(),
        parsedFromOriginal.getMonth(),
        parsedFromOriginal.getDate()
      );
    }
    const parsedFromCleaned = new Date(cleaned);
    if (!Number.isNaN(parsedFromCleaned.getTime())) {
      return buildParsedDate(
        parsedFromCleaned.getFullYear(),
        parsedFromCleaned.getMonth(),
        parsedFromCleaned.getDate()
      );
    }
  }

  return null;
}

/**
 * Computes local start and end timestamps (ms) for a TermFinalExam.
 */
export function getTermFinalTimestamps(exam: TermFinalExam): { startMs: number; endMs: number } {
  const parts = exam.dateISO.split('-').map((n) => parseInt(n, 10));
  const year = parts[0] || new Date().getFullYear();
  const monthIdx = (parts[1] || 1) - 1;
  const day = parts[2] || 1;

  const startMins = exam.startTime ? timeToMinutes(exam.startTime) : 10 * 60;
  let endMins = exam.endTime ? timeToMinutes(exam.endTime) : startMins + 180;
  if (endMins <= startMins) {
    endMins = startMins + 180;
  }

  const startMs = new Date(
    year,
    monthIdx,
    day,
    Math.floor(startMins / 60),
    startMins % 60,
    0,
    0
  ).getTime();

  const endMs = new Date(
    year,
    monthIdx,
    day,
    Math.floor(endMins / 60),
    endMins % 60,
    0,
    0
  ).getTime();

  return { startMs, endMs };
}

export function isTermFinalPast(exam: TermFinalExam, nowMs: number = Date.now()): boolean {
  const { endMs } = getTermFinalTimestamps(exam);
  return nowMs > endMs;
}

export function isTermFinalActive(exam: TermFinalExam, nowMs: number = Date.now()): boolean {
  if (exam.status === 'Cancelled') return false;
  const { startMs, endMs } = getTermFinalTimestamps(exam);
  return nowMs >= startMs && nowMs <= endMs;
}

export function isTermFinalUpcoming(exam: TermFinalExam, nowMs: number = Date.now()): boolean {
  if (exam.status === 'Cancelled') return false;
  const { endMs } = getTermFinalTimestamps(exam);
  return nowMs <= endMs;
}

/**
 * Returns true when at least one upcoming (non-cancelled, non-completed) Term Final exam exists.
 */
export function hasUpcomingTermFinals(
  exams: TermFinalExam[],
  nowMs: number = Date.now()
): boolean {
  return exams.some((exam) => isTermFinalUpcoming(exam, nowMs));
}

/**
 * Returns true when upcoming (non-cancelled) TF exams exist AND `nowMs` falls within
 * 7 calendar days before the earliest upcoming TF exam date through the latest TF exam's end time.
 */
export function isWithinTermFinalWindow(
  exams: TermFinalExam[],
  nowMs: number = Date.now()
): boolean {
  const upcomingExams = exams.filter((exam) => isTermFinalUpcoming(exam, nowMs));
  if (upcomingExams.length === 0) return false;

  const sorted = sortTermFinalsChronologically(upcomingExams);
  const earliest = sorted[0];
  const [y, m, d] = earliest.dateISO.split('-').map((n) => parseInt(n, 10));
  const windowStartMs = new Date(y, (m || 1) - 1, (d || 1) - 7, 0, 0, 0, 0).getTime();

  let latestEndMs = 0;
  for (const exam of upcomingExams) {
    const { endMs } = getTermFinalTimestamps(exam);
    if (endMs > latestEndMs) latestEndMs = endMs;
  }

  return nowMs >= windowStartMs && nowMs <= latestEndMs;
}

export function sortTermFinalsChronologically(exams: TermFinalExam[]): TermFinalExam[] {
  return [...exams].sort((a, b) => {
    const aTs = getTermFinalTimestamps(a);
    const bTs = getTermFinalTimestamps(b);
    if (aTs.startMs !== bTs.startMs) return aTs.startMs - bTs.startMs;
    if (aTs.endMs !== bTs.endMs) return aTs.endMs - bTs.endMs;
    return a.courseCode.localeCompare(b.courseCode);
  });
}

export function getTermFinalRelativeLabel(exam: TermFinalExam, nowMs: number = Date.now()): string {
  if (isTermFinalActive(exam, nowMs)) return 'Active Now';

  const now = new Date(nowMs);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const [y, m, d] = exam.dateISO.split('-').map((n) => parseInt(n, 10));
  const examDayStart = new Date(y, (m || 1) - 1, d || 1).getTime();
  const dayDiff = Math.round((examDayStart - todayStart) / 86400000);

  if (dayDiff === 0) return 'Today';
  if (dayDiff === 1) return 'Tomorrow';
  return '';
}

export function termFinalToRoutineEvent(exam: TermFinalExam): RoutineEvent {
  return {
    id: exam.id,
    day: exam.weekdayLong,
    startTime: exam.startTime,
    endTime: exam.endTime,
    subject: exam.subject,
    teacher: exam.teacher || '',
    room: exam.room,
    type: 'TF',
    status: exam.status,
    syllabus: exam.syllabus || '',
    marks: exam.marks || '',
    dateLabel: `${exam.weekdayShort}, ${exam.displayDate}`,
  };
}
