import { RoutineEvent } from '../types/routine';

export interface DispatchLogItem {
  id: string;
  time: string; // e.g., "16:16"
  type: 'CANCELLATION' | 'ROOM REALLOCATION' | 'EXAM UPDATE' | 'FACULTY UPDATE' | 'NEW SLOT' | 'SYSTEM READY';
  message: string;
}

export const BASELINE_STORAGE_KEY = 'mse24_baseline_state';
export const DISPATCH_LOGS_KEY = 'mse24_dispatch_logs';

/**
 * Computes unique composite key for a schedule row:
 * ${row.day}_${row.startTime}_${row.subject}
 */
export function buildCompositeKey(evt: RoutineEvent): string {
  return `${evt.day}_${evt.startTime}_${evt.subject}`.trim();
}

/**
 * Constructs a volatile content signature hash from:
 * ${row.room}|${row.status}|${row.teacher}|${row.syllabus}|${row.marks}
 */
export function buildContentSignature(evt: RoutineEvent): string {
  return `${evt.room || ''}|${evt.status || 'Normal'}|${evt.teacher || ''}|${evt.syllabus || ''}|${evt.marks || ''}`;
}

/**
 * Mathematically sound differential engine that diffs fresh parsed events against cached baseline state.
 * Never re-logs identical rows upon resyncing.
 */
export function processDifferentialLogs(freshEvents: RoutineEvent[]): {
  newLogsCount: number;
  logs: DispatchLogItem[];
} {
  const now = new Date();
  const timeFormatted = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  // Construct current snapshot mapping: compositeKey -> { signature, event }
  const currentSnapshot: Record<string, { signature: string; event: RoutineEvent }> = {};
  freshEvents.forEach((evt) => {
    const key = buildCompositeKey(evt);
    currentSnapshot[key] = {
      signature: buildContentSignature(evt),
      event: evt,
    };
  });

  // Read cached baseline state
  let cachedBaselineRaw: string | null = null;
  try {
    cachedBaselineRaw = localStorage.getItem(BASELINE_STORAGE_KEY);
  } catch (e) {
    console.warn('localStorage read error:', e);
  }

  // Read existing dispatch logs
  let existingLogs: DispatchLogItem[] = [];
  try {
    const rawLogs = localStorage.getItem(DISPATCH_LOGS_KEY);
    if (rawLogs) {
      existingLogs = JSON.parse(rawLogs);
    }
  } catch (e) {
    existingLogs = [];
  }

  // FIRST LOAD / INITIAL SETUP
  if (!cachedBaselineRaw) {
    const initialReadyLog: DispatchLogItem = {
      id: `sys-${Date.now()}`,
      time: timeFormatted,
      type: 'SYSTEM READY',
      message: '[SYSTEM READY]: Baseline schedule loaded. Monitoring for live changes.',
    };

    const initialLogs = [initialReadyLog];
    try {
      localStorage.setItem(BASELINE_STORAGE_KEY, JSON.stringify(currentSnapshot));
      localStorage.setItem(DISPATCH_LOGS_KEY, JSON.stringify(initialLogs));
    } catch (e) {
      console.warn('localStorage write error:', e);
    }

    return {
      newLogsCount: 1,
      logs: initialLogs,
    };
  }

  // SUBSEQUENT SYNCS: Compare against cached baseline snapshot
  let cachedBaseline: Record<string, { signature: string; event: RoutineEvent }> = {};
  try {
    cachedBaseline = JSON.parse(cachedBaselineRaw);
  } catch (e) {
    cachedBaseline = {};
  }

  const generatedNewLogs: DispatchLogItem[] = [];

  // Check each current item against cached baseline
  Object.keys(currentSnapshot).forEach((compositeKey) => {
    const currentItem = currentSnapshot[compositeKey];
    const cachedItem = cachedBaseline[compositeKey];

    // CASE 1: Completely new class slot added
    if (!cachedItem) {
      const evt = currentItem.event;
      generatedNewLogs.push({
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        time: timeFormatted,
        type: 'NEW SLOT',
        message: `[NEW SLOT] ${evt.day} ${evt.startTime} ${evt.subject} added to schedule`,
      });
      return;
    }

    // CASE 2: Identical signature -> IGNORE (0 logs generated)
    if (currentItem.signature === cachedItem.signature) {
      return;
    }

    // CASE 3: Signature changed -> Identify volatile attribute that changed
    const cur = currentItem.event;
    const prev = cachedItem.event;

    let logType: DispatchLogItem['type'] = 'EXAM UPDATE';
    let message = '';

    if (cur.status !== prev.status) {
      if (cur.status === 'Cancelled') {
        logType = 'CANCELLATION';
        message = `[ALERT] ${cur.day} ${cur.startTime} ${cur.subject} marked CANCELLED`;
      } else {
        logType = 'NEW SLOT';
        message = `[RESTORED] ${cur.day} ${cur.startTime} ${cur.subject} restored to active`;
      }
    } else if (cur.room !== prev.room) {
      logType = 'ROOM REALLOCATION';
      message = `[ROOM CHANGE] ${cur.day} ${cur.startTime} ${cur.subject} moved to ${cur.room || 'TBA'}`;
    } else if (cur.syllabus !== prev.syllabus || cur.marks !== prev.marks) {
      logType = 'EXAM UPDATE';
      message = `[EXAM UPDATE] ${cur.day} ${cur.startTime} ${cur.subject} syllabus/marks modified`;
    } else if (cur.teacher !== prev.teacher) {
      logType = 'FACULTY UPDATE';
      message = `[FACULTY REALLOCATION] ${cur.day} ${cur.startTime} ${cur.subject} instructor updated`;
    } else {
      message = `[DISPATCH] ${cur.day} ${cur.startTime} ${cur.subject} parameters modified`;
    }

    generatedNewLogs.push({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      time: timeFormatted,
      type: logType,
      message,
    });
  });

  // Check for deleted slots from cached baseline
  Object.keys(cachedBaseline).forEach((compositeKey) => {
    if (!currentSnapshot[compositeKey]) {
      const prev = cachedBaseline[compositeKey].event;
      generatedNewLogs.push({
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        time: timeFormatted,
        type: 'CANCELLATION',
        message: `[DELETED] ${prev.day} ${prev.startTime} ${prev.subject} withdrawn from schedule`,
      });
    }
  });

  // Prepend newly generated items and cap at 10 most recent updates
  const updatedLogs = [...generatedNewLogs, ...existingLogs].slice(0, 10);

  // Update localStorage with fresh snapshot & logs
  try {
    localStorage.setItem(BASELINE_STORAGE_KEY, JSON.stringify(currentSnapshot));
    localStorage.setItem(DISPATCH_LOGS_KEY, JSON.stringify(updatedLogs));
  } catch (e) {
    console.warn('localStorage write error:', e);
  }

  return {
    newLogsCount: generatedNewLogs.length,
    logs: updatedLogs,
  };
}

/**
 * Clears the dispatch history logs without clearing baseline snapshot state.
 */
export function clearDispatchLogs(): DispatchLogItem[] {
  const timeFormatted = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const resetLog: DispatchLogItem = {
    id: `clear-${Date.now()}`,
    time: timeFormatted,
    type: 'SYSTEM READY',
    message: '[LOGS CLEARED]: History wiped. Baseline state preserved.',
  };

  const logs = [resetLog];
  try {
    localStorage.setItem(DISPATCH_LOGS_KEY, JSON.stringify(logs));
  } catch (e) {
    console.warn('localStorage write error:', e);
  }

  return logs;
}

/**
 * Loads current cached dispatch logs.
 */
export function getCachedDispatchLogs(): DispatchLogItem[] {
  try {
    const raw = localStorage.getItem(DISPATCH_LOGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('localStorage read error:', e);
  }
  return [];
}
