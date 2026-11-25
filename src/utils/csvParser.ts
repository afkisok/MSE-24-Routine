import { RoutineEvent, RoutineAssignment, EventType, EventStatus } from '../types/routine';

/**
 * Standard CSV parser that handles quotes and commas
 */
export function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let insideQuote = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        currentVal += '"';
        i++; // skip escaped quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !insideQuote) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentVal.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Converts parsed CSV rows into separated weekly RoutineEvent[] and active RoutineAssignment[]
 * Expected headers (case-insensitive):
 * day, startTime, endTime, subject, teacher, room, type, status, syllabus, marks
 */
export function parseRoutineCSVRows(rows: string[][]): {
  events: RoutineEvent[];
  assignments: RoutineAssignment[];
} {
  if (rows.length < 2) return { events: [], assignments: [] };

  const headers = rows[0].map((h) => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ''));

  const dayIdx = headers.findIndex((h) => h.includes('day'));
  const startIdx = headers.findIndex((h) => h.includes('start'));
  const endIdx = headers.findIndex((h) => h.includes('end'));
  const subjectIdx = headers.findIndex((h) => h.includes('subject') || h.includes('course'));
  const teacherIdx = headers.findIndex((h) => h.includes('teacher') || h.includes('instructor'));
  const roomIdx = headers.findIndex((h) => h.includes('room'));
  const typeIdx = headers.findIndex((h) => h.includes('type'));
  const statusIdx = headers.findIndex((h) => h.includes('status'));
  const syllabusIdx = headers.findIndex((h) => h.includes('syllabus'));
  const marksIdx = headers.findIndex((h) => h.includes('mark') || h.includes('grade'));

  const validDays: Array<RoutineEvent['day']> = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  const events: RoutineEvent[] = [];
  const assignments: RoutineAssignment[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length < 2) continue;

    const rawDay = (dayIdx >= 0 ? row[dayIdx] : '')?.trim() || '';
    const rawType = (typeIdx >= 0 ? row[typeIdx] : '')?.trim() || '';
    const rawStatus = (statusIdx >= 0 ? row[statusIdx] : '')?.trim() || '';

    const lowerDay = rawDay.toLowerCase();
    const lowerType = rawType.toLowerCase();
    const lowerStatus = rawStatus.toLowerCase();

    // Route Assignment rows (by day or type, case-insensitive) out of the weekly grid
    const isAssignmentRow =
      lowerDay === 'assignment' ||
      lowerDay === 'assignments' ||
      lowerType === 'assignment' ||
      lowerType === 'assignments';

    if (isAssignmentRow) {
      if (lowerStatus === 'done' || lowerStatus === 'closed') {
        continue;
      }

      const subject = (subjectIdx >= 0 ? row[subjectIdx] : '')?.trim() || '';
      const syllabus = (syllabusIdx >= 0 ? row[syllabusIdx] : '')?.trim() || '';
      if (!subject && !syllabus) continue;

      const teacher = (teacherIdx >= 0 ? row[teacherIdx] : '')?.trim() || '';
      const room = (roomIdx >= 0 ? row[roomIdx] : '')?.trim() || '';
      const endTime = (endIdx >= 0 ? row[endIdx] : '')?.trim() || '';
      const marks = (marksIdx >= 0 ? row[marksIdx] : '')?.trim() || '';

      assignments.push({
        id: `assignment-${r}`,
        subject: subject || 'Untitled Assignment',
        syllabus,
        teacher,
        room,
        endTime,
        status: rawStatus || 'Active',
        marks,
      });
      continue;
    }

    if (row.length < 3) continue;

    const dayMatch = validDays.find((d) => d.toLowerCase() === lowerDay) || 'Sunday';

    const startTime = (startIdx >= 0 ? row[startIdx] : '')?.trim() || '08:00';
    const endTime = (endIdx >= 0 ? row[endIdx] : '')?.trim() || '08:50';
    const subject = (subjectIdx >= 0 ? row[subjectIdx] : '')?.trim() || 'Unnamed Course';
    const teacher = (teacherIdx >= 0 ? row[teacherIdx] : '')?.trim() || '';
    const room = (roomIdx >= 0 ? row[roomIdx] : '')?.trim() || '';

    const effectiveRawType = rawType || 'Lecture';
    const effectiveLowerType = effectiveRawType.toLowerCase();
    let type: EventType;
    if (
      effectiveLowerType.includes('exam') ||
      effectiveLowerType === 'ct' ||
      effectiveLowerType.startsWith('test')
    ) {
      type = 'Exam';
    } else if (effectiveLowerType.includes('lab') || effectiveLowerType.includes('sessional')) {
      // Under no circumstance should a string containing "lab" (like "Lab-A") ever fall back to "LECTURE"
      type = effectiveRawType || 'Lab';
    } else {
      type = 'Lecture';
    }

    const effectiveRawStatus = rawStatus || 'Normal';
    const status: EventStatus =
      effectiveRawStatus.toLowerCase() === 'cancelled'
        ? 'Cancelled'
        : effectiveRawStatus.toLowerCase() === 'rescheduled'
        ? 'Rescheduled'
        : 'Normal';

    const syllabus = (syllabusIdx >= 0 ? row[syllabusIdx] : '')?.trim() || '';
    const marks = (marksIdx >= 0 ? row[marksIdx] : '')?.trim() || '';

    events.push({
      id: `csv-${r}`,
      day: dayMatch,
      startTime,
      endTime,
      subject,
      teacher,
      room,
      type,
      status,
      syllabus,
      marks,
    });
  }

  return { events, assignments };
}

/**
 * Backwards-compatible helper returning only RoutineEvent[]
 */
export function csvRowsToEvents(rows: string[][]): RoutineEvent[] {
  return parseRoutineCSVRows(rows).events;
}
