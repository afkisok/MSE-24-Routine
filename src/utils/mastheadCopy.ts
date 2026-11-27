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
type WeightedVariationPool = readonly [MastheadLines, MastheadLines, MastheadLines, MastheadLines];

const COPY_POOLS: Record<
  | 'termFinalToday'
  | 'examToday'
  | 'postFinalsBreak'
  | 'termFinalsWindow'
  | 'betweenClasses'
  | 'labDay'
  | 'noClassesToday'
  | 'doneForDay'
  | 'busyDay'
  | 'lightDay',
  WeightedVariationPool
> = {
  termFinalToday: [
    ['Ready for', 'today?'],
    ['One more', 'down soon.'],
    ['Game day.', 'Stay steady.'],
    ['icl you’re', 'cooked.'],
  ],
  examToday: [
    ['Prepped for', 'the test?'],
    ['Quiz on', 'the board.'],
    ['CT day.', 'You’re good.'],
    ['Chat is', 'this real?'],
  ],
  postFinalsBreak: [
    ['Enjoying your', 'break?'],
    ['You actually', 'survived.'],
    ['Nothing left', 'to study.'],
    ['We are', 'so back.'],
  ],
  termFinalsWindow: [
    ['Locking in', 'yet?'],
    ['Surviving', 'study leave?'],
    ['Finals mode', 'is on.'],
    ['Time to', 'lock in.'],
  ],
  betweenClasses: [
    ['Catching a', 'breather?'],
    ['Between', 'classes.'],
    ['Quick break', 'for now.'],
    ['Side quest', 'time.'],
  ],
  labDay: [
    ['Ready for', 'the lab?'],
    ['Lab day', 'today.'],
    ['Long afternoon', 'ahead.'],
    ['Lwk not', 'surviving.'],
  ],
  noClassesToday: [
    ['Sleeping in', 'today?'],
    ['Clear board', 'today.'],
    ['Not much', 'going on.'],
    ['Pure vibes', 'today.'],
  ],
  doneForDay: [
    ['Heading home', 'now?'],
    ['Done for', 'the day.'],
    ['You’re free', 'now.'],
    ['Pack it', 'up, twin.'],
  ],
  busyDay: [
    ['Surviving', 'today?'],
    ['Busy day', 'ahead.'],
    ['Full plate', 'today.'],
    ['Lwk cooked', 'today.'],
  ],
  lightDay: [
    ['Taking it', 'easy today?'],
    ['Barely a', 'schedule.'],
    ['Light day', 'today.'],
    ['Rare W', 'today.'],
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

function pickWeightedVariation(pool: WeightedVariationPool, roll: number): MastheadLines {
  const normalized = ((roll % 100) + 100) % 100;
  if (normalized < 30) return pool[0];
  if (normalized < 60) return pool[1];
  if (normalized < 90) return pool[2];
  return pool[3];
}

export interface MastheadStateParams {
  events: RoutineEvent[];
  termFinals: TermFinalExam[];
  selectedGroup: 'All' | 'Group A' | 'Group B';
  nowMs: number;
  roll: number;
}

/**
 * Resolves the conversational 10-state 2-line editorial masthead copy in strict
 * priority order, picking via a weighted 30% / 30% / 30% / 10% mount-seeded roll.
 */
export function getScheduleMastheadLines({
  events,
  termFinals,
  selectedGroup,
  nowMs,
  roll,
}: MastheadStateParams): MastheadLines {
  const nowDate = new Date(nowMs);
  const todayISO = formatLocalDateISO(nowDate);
  const todayWeekday = nowDate.toLocaleDateString('en-US', { weekday: 'long' });
  const nowMins = nowDate.getHours() * 60 + nowDate.getMinutes();

  const pick = (pool: WeightedVariationPool): MastheadLines => pickWeightedVariation(pool, roll);

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
    (item) => item.meta.category === 'EXAM' && nowMins < item.effectiveEnd
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

  // 4. Term Finals Window (within 7 days of first final, or between final exam days)
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

  // 5. Between Classes (currently in a break/gap after first class started and before last class ends)
  if (todayEvents.length >= 2) {
    const firstStart = Math.min(...todayEvents.map((item) => item.start));
    const lastEnd = Math.max(...todayEvents.map((item) => item.effectiveEnd));
    const isCurrentlyInSession = todayEvents.some(
      (item) => nowMins >= item.start && nowMins < item.effectiveEnd
    );
    if (nowMins > firstStart && nowMins < lastEnd && !isCurrentlyInSession) {
      return pick(COPY_POOLS.betweenClasses);
    }
  }

  const allClassesEndedToday =
    todayEvents.length > 0 && todayEvents.every((item) => nowMins >= item.effectiveEnd);

  // 6. Lab Afternoon / Sessional Heavy (lab/sessional block scheduled on today's board while day is still active)
  const hasLabToday = todayEvents.some((item) => item.meta.category === 'LAB');
  if (hasLabToday && !allClassesEndedToday) {
    return pick(COPY_POOLS.labDay);
  }

  // 7. 0 total classes today (Friday or holiday during regular classes)
  if (todayEvents.length === 0) {
    return pick(COPY_POOLS.noClassesToday);
  }

  // 8. All of today's regular classes have already ended
  if (allClassesEndedToday) {
    return pick(COPY_POOLS.doneForDay);
  }

  // 9. 3 or more sessions today (busy lecture day)
  if (todayEvents.length >= 3) {
    return pick(COPY_POOLS.busyDay);
  }

  // 10. 1 or 2 sessions today
  return pick(COPY_POOLS.lightDay);
}
