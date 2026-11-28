import { RoutineEvent, RoutineAssignment, TermFinalExam, EventType, EventStatus } from '../types/routine';
import { parseExamDate, sortTermFinalsChronologically } from './termFinalUtils';

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

function splitCourseCodeAndTitle(rawSubject: string): { courseCode: string; courseTitle: string } {
  const cleaned = (rawSubject || '').trim();
  if (!cleaned) return { courseCode: '', courseTitle: '' };

  const colonIdx = cleaned.indexOf(':');
  if (colonIdx !== -1) {
    return {
      courseCode: cleaned.slice(0, colonIdx).trim(),
      courseTitle: cleaned.slice(colonIdx + 1).trim(),
    };
  }

  const dashMatch = cleaned.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (dashMatch) {
    return {
      courseCode: dashMatch[1].trim(),
      courseTitle: dashMatch[2].trim(),
    };
  }

  return { courseCode: cleaned, courseTitle: '' };
}

/**
 * Converts parsed CSV rows into separated weekly RoutineEvent[], active RoutineAssignment[],
 * and chronological TermFinalExam[] (Type = TF).
 * Expected headers (case-insensitive):
 * day, startTime, endTime, subject (and/or courseCode, courseTitle), teacher, room, type, status, syllabus, marks
 */
export function parseRoutineCSVRows(rows: string[][]): {
  events: RoutineEvent[];
  assignments: RoutineAssignment[];
  termFinals: TermFinalExam[];
} {
  if (rows.length < 2) return { events: [], assignments: [], termFinals: [] };

  const headers = rows[0].map((h) => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ''));

  const dayIdx = headers.findIndex((h) => h.includes('day') || h === 'date');
  const startIdx = headers.findIndex((h) => h.includes('start'));
  const endIdx = headers.findIndex((h) => h.includes('end'));
  const courseCodeIdx = headers.findIndex((h) => h === 'coursecode' || h === 'code');
  const courseTitleIdx = headers.findIndex((h) => h === 'coursetitle' || h === 'title');
  const subjectIdx = headers.findIndex(
    (h) => h.includes('subject') || h === 'course' || h === 'coursename'
  );
  const fallbackSubjectIdx =
    subjectIdx >= 0 ? subjectIdx : headers.findIndex((h) => h.includes('course'));
  const teacherIdx = headers.findIndex(
    (h) => h.includes('teacher') || h.includes('instructor') || h.includes('faculty')
  );
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
  const termFinals: TermFinalExam[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length < 2) continue;

    const rawDay = (dayIdx >= 0 ? row[dayIdx] : '')?.trim() || '';
    const rawType = (typeIdx >= 0 ? row[typeIdx] : '')?.trim() || '';
    const rawStatus = (statusIdx >= 0 ? row[statusIdx] : '')?.trim() || '';

    const lowerDay = rawDay.toLowerCase();
    const lowerType = rawType.toLowerCase();
    const lowerStatus = rawStatus.toLowerCase();

    // 1. Route Assignment rows (by day or type, case-insensitive) out of the weekly grid
    const isAssignmentRow =
      lowerDay === 'assignment' ||
      lowerDay === 'assignments' ||
      lowerType === 'assignment' ||
      lowerType === 'assignments';

    if (isAssignmentRow) {
      if (lowerStatus === 'done' || lowerStatus === 'closed') {
        continue;
      }

      const subject = (fallbackSubjectIdx >= 0 ? row[fallbackSubjectIdx] : '')?.trim() || '';
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

    // 2. Route Term Final rows into dedicated chronological exam list
    const normalizedType = lowerType.replace(/\s+/g, ' ');
    const isTermFinalRow =
      normalizedType === 'tf' ||
      normalizedType === 'term final' ||
      normalizedType === 'term finals' ||
      normalizedType === 'termfinal' ||
      normalizedType === 'termfinals' ||
      normalizedType === 'final' ||
      normalizedType === 'finals';

    if (isTermFinalRow) {
      const parsedDate = parseExamDate(rawDay);
      if (!parsedDate) continue;

      const startTime = (startIdx >= 0 ? row[startIdx] : '')?.trim() || '10:00';
      const endTime = (endIdx >= 0 ? row[endIdx] : '')?.trim() || '13:00';

      const explicitCode = (courseCodeIdx >= 0 ? row[courseCodeIdx] : '')?.trim() || '';
      const explicitTitle = (courseTitleIdx >= 0 ? row[courseTitleIdx] : '')?.trim() || '';
      const rawSubject = (subjectIdx >= 0 ? row[subjectIdx] : '')?.trim() || '';

      let courseCode = explicitCode;
      let courseTitle = explicitTitle;

      if (!courseCode && !courseTitle && rawSubject) {
        const split = splitCourseCodeAndTitle(rawSubject);
        courseCode = split.courseCode;
        courseTitle = split.courseTitle;
      } else if (courseCode && !courseTitle && rawSubject && rawSubject !== courseCode) {
        const split = splitCourseCodeAndTitle(rawSubject);
        courseTitle = split.courseTitle || (split.courseCode !== courseCode ? split.courseCode : '');
      }

      if (!courseCode && !courseTitle) continue;

      const subject =
        courseCode && courseTitle
          ? `${courseCode}: ${courseTitle}`
          : courseCode || courseTitle;

      const room = (roomIdx >= 0 ? row[roomIdx] : '')?.trim() || '';
      const teacher = (teacherIdx >= 0 ? row[teacherIdx] : '')?.trim() || '';
      const syllabus = (syllabusIdx >= 0 ? row[syllabusIdx] : '')?.trim() || '';
      const marks = (marksIdx >= 0 ? row[marksIdx] : '')?.trim() || '';

      const status: EventStatus =
        lowerStatus === 'cancelled' || lowerStatus === 'canceled'
          ? 'Cancelled'
          : lowerStatus === 'rescheduled'
          ? 'Rescheduled'
          : 'Normal';

      termFinals.push({
        id: `tf-${r}`,
        rawDate: rawDay,
        dateISO: parsedDate.dateISO,
        displayDate: parsedDate.displayDate,
        weekdayShort: parsedDate.weekdayShort,
        weekdayLong: parsedDate.weekdayLong,
        startTime,
        endTime,
        courseCode: courseCode || courseTitle,
        courseTitle,
        subject,
        room,
        teacher,
        status,
        syllabus,
        marks,
      });
      continue;
    }

    if (row.length < 3) continue;

    const dayMatch = validDays.find(
      (d) =>
        d.toLowerCase() === lowerDay ||
        (lowerDay.length >= 3 && d.toLowerCase().startsWith(lowerDay.slice(0, 3)))
    );
    if (!dayMatch) continue;

    const startTime = (startIdx >= 0 ? row[startIdx] : '')?.trim() || '08:00';
    const endTime = (endIdx >= 0 ? row[endIdx] : '')?.trim() || '08:50';

    const explicitCode = (courseCodeIdx >= 0 ? row[courseCodeIdx] : '')?.trim() || '';
    const explicitTitle = (courseTitleIdx >= 0 ? row[courseTitleIdx] : '')?.trim() || '';
    const rawSubject = (fallbackSubjectIdx >= 0 ? row[fallbackSubjectIdx] : '')?.trim() || '';
    const subject =
      rawSubject ||
      (explicitCode && explicitTitle
        ? `${explicitCode}: ${explicitTitle}`
        : explicitCode || explicitTitle || 'Unnamed Course');

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
      effectiveRawStatus.toLowerCase() === 'cancelled' || effectiveRawStatus.toLowerCase() === 'canceled'
        ? 'Cancelled'
        : effectiveRawStatus.toLowerCase() === 'rescheduled'
        ? 'Rescheduled'
        : 'Normal';

    const syllabus = (syllabusIdx >= 0 ? row[syllabusIdx] : '')?.trim() || '';
    const marks = (marksIdx >= 0 ? row[marksIdx] : '')?.trim() || '';

    const isExplicitOffRoutine = /\b(extra|make[\s-]?up|off[\s-]?routine)\b/i.test(
      `${rawType} ${rawStatus} ${subject}`
    );

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
      ...(isExplicitOffRoutine ? { isOffRoutine: true } : {}),
    });
  }

  return {
    events,
    assignments,
    termFinals: sortTermFinalsChronologically(termFinals),
  };
}

/**
 * Backwards-compatible helper returning only RoutineEvent[]
 */
export function csvRowsToEvents(rows: string[][]): RoutineEvent[] {
  return parseRoutineCSVRows(rows).events;
}
