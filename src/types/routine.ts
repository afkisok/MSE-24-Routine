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
