import { RoutineEvent, TermFinalExam } from '../types/routine';
import { parseAlternatingSchedule } from './alternatingLabEngine';
import {
  getTermFinalTimestamps,
  isTermFinalPast,
  isTermFinalUpcoming,
  sortTermFinalsChronologically,
} from './termFinalUtils';
import { timeToMinutes } from './timeCalculations';

export type MastheadLines = readonly [string, string];

const COPY_POOLS: Record<
  | 'termFinalToday'
  | 'examToday'
  | 'postFinalsBreak'
  | 'termFinalsWindow'
  | 'noClassesToday'
  | 'doneForDay'
  | 'busyDay'
  | 'lightDay',
  readonly MastheadLines[]
> = {
  termFinalToday: [
    ['Finals day.', 'Stay sharp.'],
    ['Final exam', 'on deck.'],
    ['Game day.', 'Stay steady.'],
  ],
  examToday: [
    ['Exam day.', 'Stay sharp.'],
    ['Test on', 'the board.'],
    ['Quiz day.', 'You got this.'],
  ],
  postFinalsBreak: [
    ['Enjoying your', 'break?'],
    ['Term is', 'all wrapped.'],
    ['Nothing left', 'to study.'],
  ],
  termFinalsWindow: [
    ['Finals week.', 'Stay focused.'],
    ['Home stretch', 'of the term.'],
    ['Deep focus', 'mode on.'],
  ],
  noClassesToday: [
    ['Nothing on', 'today.'],
    ['Clear board', 'today.'],
    ['Not much', 'going on.'],
  ],
  doneForDay: [
    ['Done for', 'the day.'],
    ['Classes wrapped', 'for today.'],
    ['All clear', 'now.'],
  ],
  busyDay: [
    ['Busy day', 'ahead.'],
    ['Packed board', 'today.'],
    ['Heavy schedule', 'ahead.'],
  ],
  lightDay: [
    ['Light day', 'today.'],
    ['Easy schedule', 'today.'],
    ['Not much', 'on today.'],
  ],
};

function formatLocalDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isCancelledStatus(status?: string): boolean {
  const normalized = (status || '').trim().toLowerCase();
  return normalized === 'cancelled' || normalized === 'canceled';
}

export interface MastheadStateParams {
  events: RoutineEvent[];
  termFinals: TermFinalExam[];
  selectedGroup: 'All' | 'Group A' | 'Group B';
  nowMs: number;
  seed: number;
}

/**
 * Resolves the deadpan, schedule-aware 2-line editorial masthead copy in strict
 * priority order, picking deterministically via seed % variations.length.
 */
export function getScheduleMastheadLines({
  events,
  termFinals,
  selectedGroup,
  nowMs,
  seed,
}: MastheadStateParams): MastheadLines {
  const nowDate = new Date(nowMs);
  const todayISO = formatLocalDateISO(nowDate);
  const todayWeekday = nowDate.toLocaleDateString('en-US', { weekday: 'long' });
  const nowMins = nowDate.getHours() * 60 + nowDate.getMinutes();

  const pick = (pool: readonly MastheadLines[]): MastheadLines =>
    pool[((seed % pool.length) + pool.length) % pool.length];

  const scheduledTermFinals = termFinals.filter((exam) => !isCancelledStatus(exam.status));

  // Today's active (non-cancelled) regular routine entries matching the active group filter
  const todayEvents = events
    .filter((evt) => {
      if (evt.day.toLowerCase() !== todayWeekday.toLowerCase()) return false;
      if (isCancelledStatus(evt.status)) return false;
      if (!(evt.subject || '').trim()) return false;
      const meta = parseAlternatingSchedule(evt.type, evt.subject, evt.syllabus);
      if (selectedGroup === 'Group A' && meta.groupVariant === 'B') return false;
      if (selectedGroup === 'Group B' && meta.groupVariant === 'A') return false;
      return true;
    })
    .map((evt) => {
      const meta = parseAlternatingSchedule(evt.type, evt.subject, evt.syllabus);
      const start = timeToMinutes(evt.startTime);
      const end = timeToMinutes(evt.endTime);
      const effectiveEnd = end > start ? end : start + 50;
      return { evt, meta, start, effectiveEnd };
    });

  // 1. Term Final exam scheduled today (upcoming or active)
  const hasTermFinalToday = scheduledTermFinals.some(
    (exam) => exam.dateISO === todayISO && isTermFinalUpcoming(exam, nowMs)
  );
  if (hasTermFinalToday) {
    return pick(COPY_POOLS.termFinalToday);
  }

  // 2. Regular CT / Exam scheduled today (upcoming or active)
  const hasRegularExamToday = todayEvents.some(
    (item) => item.meta.category === 'EXAM' && nowMins <= item.effectiveEnd
  );
  if (hasRegularExamToday) {
    return pick(COPY_POOLS.examToday);
  }

  // 3. Post-Finals Break (all Term Final exams on the sheet have finished)
  if (
    scheduledTermFinals.length > 0 &&
    scheduledTermFinals.every((exam) => isTermFinalPast(exam, nowMs))
  ) {
    return pick(COPY_POOLS.postFinalsBreak);
  }

  // 4. Term Finals Window (within 7 days leading up to the first Term Final, or between Term Final exam days)
  if (scheduledTermFinals.length > 0) {
    const sorted = sortTermFinalsChronologically(scheduledTermFinals);
    const firstExam = sorted[0];
    const [y, m, d] = firstExam.dateISO.split('-').map((n) => parseInt(n, 10));
    const sevenDaysBeforeStartMs = new Date(y, (m || 1) - 1, (d || 1) - 7, 0, 0, 0, 0).getTime();

    let latestEndMs = 0;
    for (const exam of scheduledTermFinals) {
      const { endMs } = getTermFinalTimestamps(exam);
      if (endMs > latestEndMs) latestEndMs = endMs;
    }

    if (nowMs >= sevenDaysBeforeStartMs && nowMs <= latestEndMs) {
      return pick(COPY_POOLS.termFinalsWindow);
    }
  }

  // 5. 0 total classes today (e.g., Friday or holiday during regular classes)
  if (todayEvents.length === 0) {
    return pick(COPY_POOLS.noClassesToday);
  }

  // 6. All of today's regular classes have already ended
  if (todayEvents.every((item) => nowMins > item.effectiveEnd)) {
    return pick(COPY_POOLS.doneForDay);
  }

  // 7. 3 or more sessions today (or a lab + 2 lectures)
  const labCount = todayEvents.filter((item) => item.meta.category === 'LAB').length;
  const lectureCount = todayEvents.filter((item) => item.meta.category === 'LECTURE').length;
  if (todayEvents.length >= 3 || (labCount >= 1 && lectureCount >= 2)) {
    return pick(COPY_POOLS.busyDay);
  }

  // 8. 1 or 2 sessions today
  return pick(COPY_POOLS.lightDay);
}
