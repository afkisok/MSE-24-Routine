export type EventType = 'Lecture' | 'Lab' | 'Exam' | string;
export type EventStatus = 'Normal' | 'Cancelled' | 'Rescheduled' | string;

export const DEFAULT_ROUTINE_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRqt1ukuTIbfOY1vwoh59yq1c1i6-b085awah1t0J36rStNDHzZUtvyp8MHVRjh9HQyF38XZ7__LGMQ/pub?output=csv';

export interface RoutineEvent {
  id?: string;
  day: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  startTime: string; // "HH:MM" e.g. "10:40"
  endTime: string;   // "HH:MM" e.g. "11:30"
  subject: string;
  teacher: string;
  room: string;
  type: EventType;
  status: EventStatus;
  syllabus?: string;
  marks?: string;
  dateLabel?: string; // Optional formatted exam date e.g. "Sat, Dec 12" for Term Finals
}

export interface TermFinalExam {
  id: string;
  rawDate: string;
  dateISO: string;      // Canonical local "YYYY-MM-DD"
  displayDate: string;  // e.g. "Dec 12"
  weekdayShort: string; // e.g. "Sat"
  weekdayLong: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  startTime: string;
  endTime: string;
  courseCode: string;
  courseTitle: string;
  subject: string;
  room: string;
  teacher: string;
  status: EventStatus;
  syllabus?: string;
  marks?: string;
}

export interface ChangeLogItem {
  id?: string;
  timestamp: string;
  text: string;
}

export interface AssignmentItem {
  id?: string;
  day: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  subject: string;
  title: string;
  task_details: string;
  marks_weight: string;
}

export interface RoutineAssignment {
  id: string;
  subject: string;
  syllabus: string;
  teacher: string;
  room: string;
  endTime: string;
  status: string;
  marks?: string;
}
