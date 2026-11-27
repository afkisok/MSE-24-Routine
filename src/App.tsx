import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { RoutineEvent, RoutineAssignment, TermFinalExam, DEFAULT_ROUTINE_CSV_URL } from './types/routine';
import { baselineTestData } from './data/baselineData';
import {
  DAY_START_MINUTES,
  TOTAL_DAY_MINUTES,
  computeDynamicDayEndMinutes,
  formatTo12Hour,
  timeToMinutes,
} from './utils/timeCalculations';
import { parseAlternatingSchedule } from './utils/alternatingLabEngine';
import { parseCSV, parseRoutineCSVRows } from './utils/csvParser';
import { processDifferentialLogs } from './utils/deltaLogEngine';
import {
  hasUpcomingTermFinals,
  isWithinTermFinalWindow,
  termFinalToRoutineEvent,
} from './utils/termFinalUtils';
import { getScheduleMastheadLines } from './utils/mastheadCopy';
import { Header } from './components/Header';
import { AtAGlanceWidget } from './components/AtAGlanceWidget';
import { MasterTimelineGrid } from './components/MasterTimelineGrid';
import { TermFinalsList } from './components/TermFinalsList';
import { EventModal } from './components/EventModal';
import { AssignmentsModal } from './components/AssignmentsModal';
import { AdminConfigModal } from './components/AdminConfigModal';
import { AdminPinDialog } from './components/AdminPinDialog';
import { StandaloneHtmlExporter } from './components/StandaloneHtmlExporter';
import { Clock, ArrowRight } from 'lucide-react';

const CACHED_EVENTS_KEY = 'mse24_cached_routine_events';
const CACHED_ASSIGNMENTS_KEY = 'mse24_cached_routine_assignments';
const CACHED_TERM_FINALS_KEY = 'mse24_cached_routine_term_finals';
const CACHED_SYNC_TIME_KEY = 'mse24_cached_sync_time';
const ADMIN_CSV_URL_KEY = 'admin_routine_csv_url';

const STALE_SYNC_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes
const VISIBLE_AUTO_REFRESH_MS = 10 * 60 * 1000; // 10 minutes
const THEME_COLOR_FADE_MS = 200;

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const BASE_OPERATIONAL_DAYS: Array<'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday'> = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
];

const DAY_TO_WEEKDAY_NUM: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

function extractShortCourseCode(subject: string): string {
  if (!subject) return '';
  const colonIdx = subject.indexOf(':');
  return (colonIdx !== -1 ? subject.slice(0, colonIdx) : subject).trim();
}

function formatOffRoutineRowLabel(evt: RoutineEvent): string {
  const courseCode = extractShortCourseCode(evt.subject);
  const meta = parseAlternatingSchedule(evt.type, evt.subject, evt.syllabus);
  const typeStatus = `${evt.type || ''} ${evt.status || ''}`.toLowerCase();
  const isExam = meta.category === 'EXAM' || /\b(exam|ct|quiz)\b/.test(typeStatus);
  const isLab = meta.category === 'LAB';
  const isSaturday = evt.day.toLowerCase() === 'saturday';

  const eventKind = isExam ? 'exam' : isLab ? 'lab' : 'class';

  if (isSaturday) {
    return `${courseCode} ${eventKind} on Saturday`;
  }

  const compactStartTime = formatTo12Hour(evt.startTime)
    .replace(/\s*(am|pm)$/i, '')
    .trim();
  return `${courseCode} ${eventKind} at ${compactStartTime}`;
}

export default function App() {
  // 1. Instant zero-lag cache resolution on mount
  const [events, setEvents] = useState<RoutineEvent[]>(() => {
    try {
      const cached = localStorage.getItem(CACHED_EVENTS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load cached events:', e);
    }
    return baselineTestData;
  });

  const [assignments, setAssignments] = useState<RoutineAssignment[]>(() => {
    try {
      const cached = localStorage.getItem(CACHED_ASSIGNMENTS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load cached assignments:', e);
    }
    return [];
  });

  const [termFinals, setTermFinals] = useState<TermFinalExam[]>(() => {
    try {
      const cached = localStorage.getItem(CACHED_TERM_FINALS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load cached term finals:', e);
    }
    return [];
  });

  const [viewOverride, setViewOverride] = useState<'weekly' | 'termFinals' | null>(null);

  const [selectedEvent, setSelectedEvent] = useState<RoutineEvent | null>(null);
  const [isAssignmentsModalOpen, setIsAssignmentsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    try {
      return localStorage.getItem(CACHED_SYNC_TIME_KEY) || null;
    } catch {
      return null;
    }
  });

  // UTILITY THEME STATE ENGINE WITH SEAMLESS LOCALSTORAGE PERSISTENCE
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const stored = localStorage.getItem('aviation_theme');
      if (stored === 'dark' || stored === 'light') return stored;
    } catch (e) {
      console.warn('localStorage read error:', e);
    }
    return 'light';
  });

  const isAnyModalOpen = Boolean(
    selectedEvent ||
      isAssignmentsModalOpen ||
      isPinDialogOpen ||
      isAdminModalOpen ||
      isExportModalOpen
  );

  const isDark = theme === 'dark';
  const currentThemeColorRef = useRef<string | null>(null);
  const prevThemeRef = useRef<'light' | 'dark'>(theme);
  const themeColorRafRef = useRef<number | null>(null);
  const themeSwitchRafRef = useRef<{ outer: number | null; inner: number | null }>({
    outer: null,
    inner: null,
  });

  useEffect(() => {
    return () => {
      if (themeSwitchRafRef.current.outer !== null) {
        cancelAnimationFrame(themeSwitchRafRef.current.outer);
      }
      if (themeSwitchRafRef.current.inner !== null) {
        cancelAnimationFrame(themeSwitchRafRef.current.inner);
      }
      document.documentElement.classList.remove('theme-switching');
    };
  }, []);

  useLayoutEffect(() => {
    try {
      localStorage.setItem('aviation_theme', theme);
    } catch (e) {
      console.warn('localStorage write error:', e);
    }
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  }, [theme, isDark]);

  useLayoutEffect(() => {
    const targetColor = isDark
      ? isAnyModalOpen
        ? '#060606'
        : '#161514'
      : isAnyModalOpen
      ? '#464544'
      : '#F4F3EF';

    const existingMetas = Array.from(
      document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    );
    let dynamicMeta = existingMetas.find((el) => !el.hasAttribute('media'));

    existingMetas.forEach((el) => {
      if (el !== dynamicMeta) {
        el.remove();
      }
    });

    if (!dynamicMeta) {
      dynamicMeta = document.createElement('meta');
      dynamicMeta.name = 'theme-color';
      document.head.appendChild(dynamicMeta);
    }

    if (themeColorRafRef.current !== null) {
      cancelAnimationFrame(themeColorRafRef.current);
      themeColorRafRef.current = null;
    }

    const fromColor = currentThemeColorRef.current;
    const themeChanged = prevThemeRef.current !== theme;
    prevThemeRef.current = theme;

    // Apply immediately on initial mount, theme toggle, or when already at target
    if (!fromColor || themeChanged || fromColor.toLowerCase() === targetColor.toLowerCase()) {
      if (dynamicMeta.content !== targetColor) {
        dynamicMeta.content = targetColor;
      }
      currentThemeColorRef.current = targetColor;
      return;
    }

    // Smoothly interpolate RGB over 200ms in sync with modal backdrop fade
    const startRgb = hexToRgb(fromColor);
    const endRgb = hexToRgb(targetColor);
    const startTime = performance.now();
    const metaEl = dynamicMeta;

    const step = (now: number) => {
      const progress = Math.min(1, (now - startTime) / THEME_COLOR_FADE_MS);
      const eased = 1 - Math.pow(1 - progress, 2);
      const nextHex =
        progress >= 1
          ? targetColor
          : rgbToHex(
              startRgb[0] + (endRgb[0] - startRgb[0]) * eased,
              startRgb[1] + (endRgb[1] - startRgb[1]) * eased,
              startRgb[2] + (endRgb[2] - startRgb[2]) * eased
            );

      if (metaEl.content !== nextHex) {
        metaEl.content = nextHex;
      }
      currentThemeColorRef.current = nextHex;

      if (progress < 1) {
        themeColorRafRef.current = requestAnimationFrame(step);
      } else {
        themeColorRafRef.current = null;
      }
    };

    themeColorRafRef.current = requestAnimationFrame(step);

    return () => {
      if (themeColorRafRef.current !== null) {
        cancelAnimationFrame(themeColorRafRef.current);
        themeColorRafRef.current = null;
      }
    };
  }, [theme, isDark, isAnyModalOpen]);

  const handleToggleTheme = () => {
    const root = document.documentElement;
    if (themeSwitchRafRef.current.outer !== null) {
      cancelAnimationFrame(themeSwitchRafRef.current.outer);
      themeSwitchRafRef.current.outer = null;
    }
    if (themeSwitchRafRef.current.inner !== null) {
      cancelAnimationFrame(themeSwitchRafRef.current.inner);
      themeSwitchRafRef.current.inner = null;
    }

    root.classList.add('theme-switching');
    const nextTheme: 'light' | 'dark' = theme === 'dark' ? 'light' : 'dark';
    root.classList.toggle('dark', nextTheme === 'dark');
    root.style.colorScheme = nextTheme;
    setTheme(nextTheme);

    themeSwitchRafRef.current.outer = requestAnimationFrame(() => {
      themeSwitchRafRef.current.outer = null;
      themeSwitchRafRef.current.inner = requestAnimationFrame(() => {
        themeSwitchRafRef.current.inner = null;
        root.classList.remove('theme-switching');
      });
    });
  };

  // Section / Group filter state with localStorage persistence
  const [selectedGroup, setSelectedGroup] = useState<'All' | 'Group A' | 'Group B'>(() => {
    try {
      const stored = localStorage.getItem('mse_routine_selected_group');
      if (stored === 'Group A' || stored === 'Group B' || stored === 'All') return stored;
    } catch (e) {
      console.warn('localStorage read error:', e);
    }
    return 'All';
  });

  useEffect(() => {
    try {
      localStorage.setItem('mse_routine_selected_group', selectedGroup);
    } catch (e) {
      console.warn('localStorage write error:', e);
    }
  }, [selectedGroup]);

  const handleSelectGroup = (group: 'All' | 'Group A' | 'Group B') => {
    setSelectedGroup(group);
    try {
      localStorage.setItem('mse_routine_selected_group', group);
    } catch (e) {
      console.warn('localStorage write error:', e);
    }
  };

  // Sync state tracking
  const [syncStatus, setSyncStatus] = useState<{
    status: 'idle' | 'syncing' | 'success' | 'error';
    message: string;
  }>({
    status: 'idle',
    message: 'STANDBY // READY',
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [mastheadRoll] = useState(() => Math.floor(Math.random() * 100));
  const [currentMinuteOffset, setCurrentMinuteOffset] = useState<number | null>(null);
  const [todayName, setTodayName] = useState<string>('');
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [highlightedEventKey, setHighlightedEventKey] = useState<string | null>(null);
  const highlightTimerRef = useRef<number | null>(null);

  const hasUpcomingFinals = hasUpcomingTermFinals(termFinals, nowMs);
  const isAutoTermFinalWindow = isWithinTermFinalWindow(termFinals, nowMs);
  const isTermFinalView = hasUpcomingFinals
    ? viewOverride === 'termFinals'
      ? true
      : viewOverride === 'weekly'
      ? false
      : isAutoTermFinalWindow
    : false;

  // Automatically reset manual view override once all TF exams expire or disappear
  useEffect(() => {
    if (!hasUpcomingFinals && viewOverride !== null) {
      setViewOverride(null);
    }
  }, [hasUpcomingFinals, viewOverride]);

  // Sliding pill measurement for Group Toggle
  const groupTrackRef = useRef<HTMLDivElement | null>(null);
  const groupTabRefs = useRef<Record<'All' | 'Group A' | 'Group B', HTMLButtonElement | null>>({
    All: null,
    'Group A': null,
    'Group B': null,
  });
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 0,
    ready: false,
  });

  useLayoutEffect(() => {
    if (isTermFinalView) return;
    const updatePill = () => {
      const trackEl = groupTrackRef.current;
      const activeEl = groupTabRefs.current[selectedGroup];
      if (!trackEl || !activeEl) return;
      const trackRect = trackEl.getBoundingClientRect();
      const activeRect = activeEl.getBoundingClientRect();
      setPillStyle({
        left: activeRect.left - trackRect.left,
        width: activeRect.width,
        ready: true,
      });
    };

    updatePill();
    window.addEventListener('resize', updatePill);
    let cancelled = false;
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!cancelled) updatePill();
      });
    }
    return () => {
      cancelled = true;
      window.removeEventListener('resize', updatePill);
    };
  }, [selectedGroup, isTermFinalView]);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setIsMounted(true);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  /**
   * Resolve active CSV URL from localStorage with hardcoded official fallback
   */
  const getActiveCsvUrl = (): string => {
    try {
      const custom = localStorage.getItem(ADMIN_CSV_URL_KEY);
      if (custom && custom.trim().length > 0) {
        return custom.trim();
      }
    } catch (e) {
      console.warn('Failed to read admin CSV url from localStorage:', e);
    }
    return DEFAULT_ROUTINE_CSV_URL;
  };

  const isSyncInFlightRef = useRef(false);
  const lastSyncAtRef = useRef<number>((() => {
    try {
      const cachedIso = localStorage.getItem(CACHED_SYNC_TIME_KEY);
      if (cachedIso) {
        const parsedMs = Date.parse(cachedIso);
        if (!Number.isNaN(parsedMs)) return parsedMs;
      }
    } catch {
      // Ignore storage errors
    }
    return 0;
  })());

  /**
   * Clean Single-Table Sync & Differential Engine
   * Silent background syncs never spin the manual refresh icon.
   */
  const fetchAndSync = async (targetUrl?: string, isSilent = false) => {
    const url = (targetUrl !== undefined ? targetUrl : getActiveCsvUrl()).trim();
    if (!url) {
      if (!isSilent) setSyncStatus({ status: 'error', message: 'ERROR: EMPTY_ENDPOINT_URL' });
      return;
    }

    if (isSilent && isSyncInFlightRef.current) {
      return;
    }

    isSyncInFlightRef.current = true;
    if (!isSilent) {
      setSyncStatus({ status: 'syncing', message: 'FETCHING_STREAM...' });
    }

    try {
      let fetchUrl = url;
      try {
        const parsedUrl = new URL(url);
        parsedUrl.searchParams.set('_cb', String(Date.now()));
        fetchUrl = parsedUrl.toString();
      } catch {
        const separator = url.includes('?') ? '&' : '?';
        fetchUrl = `${url}${separator}_cb=${Date.now()}`;
      }
      const res = await fetch(fetchUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP_${res.status}`);
      const csvText = await res.text();
      const rawRows = parseCSV(csvText);
      const {
        events: parsed,
        assignments: parsedAssignments,
        termFinals: parsedTermFinals,
      } = parseRoutineCSVRows(rawRows);
      if (parsed.length === 0 && parsedAssignments.length === 0 && parsedTermFinals.length === 0) {
        throw new Error('NO_VALID_DATA_ROWS');
      }

      if (parsed.length > 0) {
        setEvents(parsed);
      }
      setAssignments(parsedAssignments);
      setTermFinals(parsedTermFinals);

      const syncCompletedMs = Date.now();
      lastSyncAtRef.current = syncCompletedMs;

      try {
        if (parsed.length > 0) {
          localStorage.setItem(CACHED_EVENTS_KEY, JSON.stringify(parsed));
        }
        localStorage.setItem(CACHED_ASSIGNMENTS_KEY, JSON.stringify(parsedAssignments));
        localStorage.setItem(CACHED_TERM_FINALS_KEY, JSON.stringify(parsedTermFinals));
        const nowISO = new Date(syncCompletedMs).toISOString();
        localStorage.setItem(CACHED_SYNC_TIME_KEY, nowISO);
        setLastSyncTime(nowISO);
      } catch (e) {
        console.warn('Failed to cache events to localStorage:', e);
      }

      // Run differential changelog engine: diff against snapshot
      const { newLogsCount } = processDifferentialLogs(parsed);

      setSyncStatus({
        status: 'success',
        message: `SYNC_OK: ${parsed.length}_CLASSES · ${newLogsCount}_DIFFS_RECORDED`,
      });
    } catch (err: any) {
      console.warn('[fetchAndSync] Execution failed:', err);
      if (!isSilent) {
        setSyncStatus({
          status: 'error',
          message: `FAILED: ${err?.message || 'NETWORK_OR_CORS_ERROR'}`,
        });
      }
    } finally {
      isSyncInFlightRef.current = false;
    }
  };

  const fetchAndSyncRef = useRef(fetchAndSync);
  fetchAndSyncRef.current = fetchAndSync;

  // Smart silent background auto-refresh:
  // - Initial silent sync on mount
  // - Stale check (> 3 min) on visibilitychange (visible) & window focus
  // - 10-minute interval active strictly while tab/app is visible
  useEffect(() => {
    const activeUrl = getActiveCsvUrl();
    fetchAndSyncRef.current(activeUrl, true);

    let pollIntervalId: number | null = null;

    const startVisiblePolling = () => {
      if (pollIntervalId !== null) return;
      pollIntervalId = window.setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchAndSyncRef.current(undefined, true);
        }
      }, VISIBLE_AUTO_REFRESH_MS);
    };

    const stopVisiblePolling = () => {
      if (pollIntervalId !== null) {
        window.clearInterval(pollIntervalId);
        pollIntervalId = null;
      }
    };

    const triggerSilentSyncIfStale = () => {
      if (document.visibilityState !== 'visible') return;
      const elapsed = Date.now() - lastSyncAtRef.current;
      if (elapsed >= STALE_SYNC_THRESHOLD_MS) {
        fetchAndSyncRef.current(undefined, true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerSilentSyncIfStale();
        startVisiblePolling();
      } else {
        stopVisiblePolling();
      }
    };

    const handleWindowFocus = () => {
      triggerSilentSyncIfStale();
      if (document.visibilityState === 'visible') {
        startVisiblePolling();
      }
    };

    if (document.visibilityState === 'visible') {
      startVisiblePolling();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      stopVisiblePolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  const handleSaveAdminUrl = (newUrl: string) => {
    try {
      if (!newUrl || newUrl === DEFAULT_ROUTINE_CSV_URL) {
        localStorage.removeItem(ADMIN_CSV_URL_KEY);
      } else {
        localStorage.setItem(ADMIN_CSV_URL_KEY, newUrl);
      }
    } catch (e) {
      console.warn('Failed to save admin CSV URL:', e);
    }
    fetchAndSync(newUrl || DEFAULT_ROUTINE_CSV_URL);
  };

  const handleResetToOfficialDefault = () => {
    try {
      localStorage.removeItem(ADMIN_CSV_URL_KEY);
    } catch (e) {
      console.warn('Failed to remove custom admin CSV URL:', e);
    }
    fetchAndSync(DEFAULT_ROUTINE_CSV_URL);
  };

  const handleResetBaseline = () => {
    try {
      localStorage.removeItem(CACHED_EVENTS_KEY);
      localStorage.removeItem(CACHED_ASSIGNMENTS_KEY);
      localStorage.removeItem(CACHED_TERM_FINALS_KEY);
    } catch (e) {
      console.warn('Failed to clear cached events:', e);
    }
    setEvents(baselineTestData);
    setAssignments([]);
    setTermFinals([]);
    setViewOverride(null);
    processDifferentialLogs(baselineTestData);
    setSyncStatus({ status: 'idle', message: 'BASELINE_DEFAULT_RESTORED' });
  };

  // Dynamic Saturday row & dynamic right-edge end time (extends past 5:00 PM when needed)
  const hasActiveSaturdayEvents = events.some((evt) => {
    if (evt.day.toLowerCase() !== 'saturday') return false;
    const status = (evt.status || '').trim().toLowerCase();
    return status !== 'cancelled' && status !== 'canceled' && Boolean((evt.subject || '').trim());
  });

  const operationalDays: Array<
    'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Saturday'
  > = hasActiveSaturdayEvents
    ? [...BASE_OPERATIONAL_DAYS, 'Saturday']
    : BASE_OPERATIONAL_DAYS;

  const dynamicDayEndMinutes = computeDynamicDayEndMinutes(events);
  const dynamicTotalDayMinutes = Math.max(
    TOTAL_DAY_MINUTES,
    dynamicDayEndMinutes - DAY_START_MINUTES
  );

  // Realtime digital clock update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setNowMs(now.getTime());
      const day = now.toLocaleDateString('en-US', { weekday: 'long' });
      setTodayName(day);

      const totalMinutes = now.getHours() * 60 + now.getMinutes();
      if (totalMinutes >= DAY_START_MINUTES && totalMinutes <= dynamicDayEndMinutes) {
        setCurrentMinuteOffset(totalMinutes - DAY_START_MINUTES);
      } else {
        setCurrentMinuteOffset(null);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 15000);
    const handleVisibilityTick = () => {
      if (document.visibilityState === 'visible') {
        updateTime();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityTick);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityTick);
    };
  }, [dynamicDayEndMinutes]);

  // Determine whether any slot is currently in progress OR still remaining later today
  const hasActiveOrRemainingSlotToday = (() => {
    if (!todayName) return false;
    const nowDate = new Date(nowMs);
    const nowMins = nowDate.getHours() * 60 + nowDate.getMinutes();

    return events.some((evt) => {
      if (evt.day.toLowerCase() !== todayName.toLowerCase()) return false;
      const status = (evt.status || '').trim().toLowerCase();
      if (status === 'cancelled' || status === 'canceled') return false;
      const meta = parseAlternatingSchedule(evt.type, evt.subject, evt.syllabus);
      if (selectedGroup === 'Group A' && meta.groupVariant === 'B') return false;
      if (selectedGroup === 'Group B' && meta.groupVariant === 'A') return false;
      const start = timeToMinutes(evt.startTime);
      const end = timeToMinutes(evt.endTime);
      const effectiveEnd = end > start ? end : start + 50;
      return nowMins <= effectiveEnd;
    });
  })();

  // Time-gated off-routine slots:
  // - Saturday events: visible only on Thu (4), Fri (5), or Sat (6) until start time passes
  // - 5:00 PM+ weekday events: visible only on the same day until start time passes
  const visibleOffRoutineSlots = (() => {
    const nowDate = new Date(nowMs);
    const todayDayNum = nowDate.getDay();
    const currentMins = nowDate.getHours() * 60 + nowDate.getMinutes();

    const items: Array<{ evt: RoutineEvent; key: string; label: string; sortScore: number }> = [];

    operationalDays.forEach((day) => {
      const dayEvents = events.filter((e) => e.day.toLowerCase() === day.toLowerCase());
      dayEvents.forEach((evt, idx) => {
        const status = (evt.status || '').trim().toLowerCase();
        if (status === 'cancelled' || status === 'canceled') return;
        if (!(evt.subject || '').trim()) return;

        const meta = parseAlternatingSchedule(evt.type, evt.subject, evt.syllabus);
        if (selectedGroup === 'Group A' && meta.groupVariant === 'B') return;
        if (selectedGroup === 'Group B' && meta.groupVariant === 'A') return;

        const startMins = timeToMinutes(evt.startTime);
        const isSaturday = evt.day.toLowerCase() === 'saturday';
        const isLateWeekday = !isSaturday && startMins >= 17 * 60;
        if (!isSaturday && !isLateWeekday) return;

        const targetDayNum = DAY_TO_WEEKDAY_NUM[evt.day];
        if (targetDayNum === undefined) return;

        if (isSaturday) {
          const isThuFriSat = todayDayNum === 4 || todayDayNum === 5 || todayDayNum === 6;
          if (!isThuFriSat) return;
          if (todayDayNum === 6 && currentMins >= startMins) return;
        } else {
          // 5:00 PM+ weekday event: same day only, hide once start time has passed
          if (todayDayNum !== targetDayNum) return;
          if (currentMins >= startMins) return;
        }

        const dayDiff = (targetDayNum - todayDayNum + 7) % 7;

        items.push({
          evt,
          key: evt.id || `${day}-${evt.startTime}-${idx}`,
          label: formatOffRoutineRowLabel(evt),
          sortScore: dayDiff * 1440 + startMins,
        });
      });
    });

    items.sort((a, b) => a.sortScore - b.sortScore);
    return items;
  })();

  const handleScrollToOffRoutineSlot = (target: { evt: RoutineEvent; key: string }) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
      const startMins = timeToMinutes(target.evt.startTime);
      const endMins = timeToMinutes(target.evt.endTime);
      const effectiveEnd = endMins > startMins ? endMins : startMins + 50;
      const centerOffset = Math.max(
        0,
        Math.min(dynamicTotalDayMinutes, (startMins + effectiveEnd) / 2 - DAY_START_MINUTES)
      );
      const focusX = (centerOffset / dynamicTotalDayMinutes) * container.scrollWidth;
      const targetScroll = Math.max(0, Math.min(maxScroll, focusX - container.clientWidth / 2));
      container.scrollTo({ left: targetScroll, behavior: 'smooth' });

      const rowEl = container.querySelector<HTMLElement>(
        `[data-day="${target.evt.day.toLowerCase()}"]`
      );
      if (rowEl) {
        const rect = rowEl.getBoundingClientRect();
        if (rect.top < 0 || rect.bottom > window.innerHeight) {
          rowEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }

    if (highlightTimerRef.current !== null) {
      window.clearTimeout(highlightTimerRef.current);
    }
    const nextKey = target.key;
    setHighlightedEventKey(null);
    window.requestAnimationFrame(() => {
      setHighlightedEventKey(nextKey);
    });
    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedEventKey(null);
      highlightTimerRef.current = null;
    }, 1400);
  };

  const handleScrollToNow = () => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const matchesSelectedGroup = (evt: RoutineEvent) => {
      const meta = parseAlternatingSchedule(evt.type, evt.subject, evt.syllabus);
      if (selectedGroup === 'Group A' && meta.groupVariant === 'B') return false;
      if (selectedGroup === 'Group B' && meta.groupVariant === 'A') return false;
      return true;
    };

    const isCancelledEvent = (evt: RoutineEvent) => {
      const normalized = (evt.status || '').trim().toLowerCase();
      return normalized === 'cancelled' || normalized === 'canceled';
    };

    // Locate the active or next upcoming matching slot for brief arrival pulse
    let targetSlot: { evt: RoutineEvent; key: string } | null = null;
    const todayOperational = operationalDays.find(
      (d) => d.toLowerCase() === todayName.toLowerCase()
    );

    if (todayOperational) {
      const dayEvents = events.filter(
        (e) => e.day.toLowerCase() === todayOperational.toLowerCase()
      );
      const candidates = dayEvents
        .map((evt, idx) => ({
          evt,
          key: evt.id || `${todayOperational}-${evt.startTime}-${idx}`,
          start: timeToMinutes(evt.startTime),
          end: timeToMinutes(evt.endTime),
        }))
        .filter((item) => !isCancelledEvent(item.evt) && matchesSelectedGroup(item.evt))
        .sort((a, b) => a.start - b.start);

      const inProgress = candidates.find((c) => nowMinutes >= c.start && nowMinutes <= c.end);
      const nextToday = candidates.find((c) => c.start > nowMinutes);
      const chosen = inProgress || nextToday || null;
      if (chosen) {
        targetSlot = { evt: chosen.evt, key: chosen.key };
      }
    }

    if (!targetSlot) {
      const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDayIdx = now.getDay();
      for (let offset = 1; offset <= 7; offset++) {
        const checkDay = weekDays[(currentDayIdx + offset) % 7];
        const opDay = operationalDays.find((d) => d.toLowerCase() === checkDay.toLowerCase());
        if (!opDay) continue;

        const dayEvents = events.filter((e) => e.day.toLowerCase() === opDay.toLowerCase());
        const candidates = dayEvents
          .map((evt, idx) => ({
            evt,
            key: evt.id || `${opDay}-${evt.startTime}-${idx}`,
            start: timeToMinutes(evt.startTime),
          }))
          .filter((item) => !isCancelledEvent(item.evt) && matchesSelectedGroup(item.evt))
          .sort((a, b) => a.start - b.start);

        if (candidates.length > 0) {
          targetSlot = { evt: candidates[0].evt, key: candidates[0].key };
          break;
        }
      }
    }

    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
      if (hasActiveOrRemainingSlotToday && currentMinuteOffset !== null) {
        const focusX = (currentMinuteOffset / dynamicTotalDayMinutes) * container.scrollWidth;
        const targetScroll = Math.max(0, Math.min(maxScroll, focusX - container.clientWidth / 2));
        container.scrollTo({ left: targetScroll, behavior: 'smooth' });
      } else if (targetSlot) {
        const slotStartOffset = Math.max(
          0,
          Math.min(
            dynamicTotalDayMinutes,
            timeToMinutes(targetSlot.evt.startTime) - DAY_START_MINUTES
          )
        );
        const focusX = (slotStartOffset / dynamicTotalDayMinutes) * container.scrollWidth;
        const targetScroll = Math.max(0, Math.min(maxScroll, focusX - container.clientWidth / 3));
        container.scrollTo({ left: targetScroll, behavior: 'smooth' });
      } else {
        container.scrollTo({ left: Math.min(240, maxScroll), behavior: 'smooth' });
      }
    }

    if (targetSlot) {
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
      }
      const nextKey = targetSlot.key;
      setHighlightedEventKey(null);
      window.requestAnimationFrame(() => {
        setHighlightedEventKey(nextKey);
      });
      highlightTimerRef.current = window.setTimeout(() => {
        setHighlightedEventKey(null);
        highlightTimerRef.current = null;
      }, 1400);
    }
  };

  const mastheadLines = getScheduleMastheadLines({
    events,
    termFinals,
    selectedGroup,
    nowMs,
    roll: mastheadRoll,
  });

  return (
    <div
      className={`relative min-h-dvh flex flex-col w-full max-w-full overflow-x-hidden font-sans transition-colors ${
        isDark
          ? 'bg-[#161514] text-stone-100 selection:bg-stone-800 selection:text-stone-100'
          : 'bg-[#F4F3EF] text-stone-900 selection:bg-stone-200 selection:text-stone-900'
      }`}
    >
      {/* Tactile warm paper grain overlay across full viewport (light & dark) */}
      <div
        aria-hidden="true"
        className={`paper-grain-overlay fixed inset-0 pointer-events-none z-50 ${
          isDark ? 'opacity-[0.03]' : 'opacity-[0.025]'
        }`}
      />

      <div className="relative z-10 flex-1 flex flex-col pb-[env(safe-area-inset-bottom)]">
        {/* Aviation Operations Header with MSE '24 Hidden Admin Door and Discreet Refresh */}
        <Header
          onManualSync={() => fetchAndSync()}
          syncStatus={syncStatus}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onTriggerAdminVerification={() => setIsPinDialogOpen(true)}
          mastheadLines={mastheadLines}
          isMounted={isMounted}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 pt-0 pb-7 flex flex-col overflow-x-hidden">
        {/* 'UP NEXT' UPCOMING SESSIONS DEPARTURES WIDGET */}
        <div
          className={`transition-[opacity,transform] duration-300 ease-out delay-[50ms] ${
            isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          <AtAGlanceWidget
            events={events}
            onSelectEvent={(evt) => setSelectedEvent(evt)}
            theme={theme}
            selectedGroup={selectedGroup}
            assignmentsCount={assignments.length}
            onOpenAssignments={() => setIsAssignmentsModalOpen(true)}
            isTermFinalMode={isAutoTermFinalWindow || isTermFinalView}
            termFinals={termFinals}
            nowMs={nowMs}
            onSelectTermFinal={(exam) => setSelectedEvent(termFinalToRoutineEvent(exam))}
          />
        </div>

        {/* UNIFIED SCHEDULE MATRIX / TERM FINALS FULL-WIDTH VIEW */}
        <div>
          <div
            className={`flex flex-col mb-3 px-1 transition-[opacity,transform] duration-300 ease-out delay-[100ms] ${
              isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            <div className="flex items-center justify-between sm:justify-start w-full mb-0">
              {hasUpcomingFinals ? (
                <div
                  className="flex items-center gap-[14px]"
                  role="tablist"
                  aria-label="Schedule view switcher"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={!isTermFinalView}
                    onClick={() => setViewOverride('weekly')}
                    className={`mb-0 font-['Newsreader',Georgia,serif] text-[1.1875rem] font-semibold tracking-[-0.015em] leading-tight cursor-pointer select-none transition-opacity duration-150 ${
                      isDark ? 'text-stone-100' : 'text-stone-900'
                    } ${!isTermFinalView ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
                  >
                    Weekly Routine
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isTermFinalView}
                    onClick={() => setViewOverride('termFinals')}
                    className={`mb-0 font-['Newsreader',Georgia,serif] text-[1.1875rem] font-semibold tracking-[-0.015em] leading-tight cursor-pointer select-none transition-opacity duration-150 ${
                      isDark ? 'text-stone-100' : 'text-stone-900'
                    } ${isTermFinalView ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
                  >
                    Term Finals
                  </button>
                </div>
              ) : (
                <h2
                  className={`mb-0 font-['Newsreader',Georgia,serif] text-[1.1875rem] font-semibold tracking-[-0.015em] leading-tight ${
                    isDark ? 'text-stone-100' : 'text-stone-900'
                  }`}
                >
                  Weekly Routine
                </h2>
              )}
            </div>

            {!isTermFinalView && (
              <>
                {/* Plain borderless muted-gray status line with optically balanced spacing above and below */}
                <div className="mt-1.5 mb-2.5 flex flex-col gap-0.5 min-w-0">
                  {visibleOffRoutineSlots.length === 0 ? (
                    <p
                      className={`text-sm leading-5 font-sans font-normal truncate select-none ${
                        isDark ? 'text-neutral-400' : 'text-neutral-500'
                      }`}
                    >
                      Nothing out of the ordinary
                    </p>
                  ) : (
                    visibleOffRoutineSlots.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleScrollToOffRoutineSlot(item)}
                        title={`Jump to ${item.label}`}
                        className={`p-0 m-0 border-0 bg-transparent text-left text-sm leading-5 font-sans font-normal tabular-nums truncate cursor-pointer select-none transition-colors duration-150 self-start max-w-full ${
                          isDark
                            ? 'text-neutral-400 hover:text-neutral-200'
                            : 'text-neutral-500 hover:text-neutral-800'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))
                  )}
                </div>

                {/* Group Selector & Jump to Now Controls (Harmonized h-9 row) */}
                <div className="flex items-center gap-2 flex-nowrap self-start">
                {/* One UI-style segmented pill selector with sliding indicator (h-9) */}
                <div
                  className={`h-9 inline-flex items-center p-1 rounded-full border border-transparent transition-colors box-border shrink-0 ${
                    isDark ? 'bg-[#100F0E]' : 'bg-[#EAE8E2]'
                  }`}
                  role="tablist"
                  aria-label="Filter schedule by Section or Lab Group"
                >
                  <div ref={groupTrackRef} className="relative h-full inline-flex items-center">
                    {/* Sliding Active Indicator Pill (concentric inside uniform p-1 outer track) */}
                    <div
                      aria-hidden="true"
                      style={{
                        transform: `translateX(${pillStyle.left}px)`,
                        width: `${pillStyle.width}px`,
                        opacity: pillStyle.ready ? 1 : 0,
                      }}
                      className={`absolute inset-y-0 left-0 rounded-full pointer-events-none ${
                        pillStyle.ready ? 'transition-[transform,width] duration-200 ease-out' : ''
                      } ${
                        isDark ? 'bg-stone-100 shadow-xs' : 'bg-stone-900 shadow-xs'
                      }`}
                    />
                    {(['All', 'Group A', 'Group B'] as const).map((groupOption) => {
                      const isSelected = selectedGroup === groupOption;
                      return (
                        <button
                          key={groupOption}
                          ref={(el) => {
                            groupTabRefs.current[groupOption] = el;
                          }}
                          type="button"
                          role="tab"
                          aria-selected={isSelected}
                          onClick={() => handleSelectGroup(groupOption)}
                          className={`relative z-10 h-full px-3.5 text-xs font-medium rounded-full transition-colors duration-150 cursor-pointer select-none flex items-center justify-center whitespace-nowrap ${
                            isSelected
                              ? isDark
                                ? 'text-stone-900'
                                : 'text-stone-50'
                              : isDark
                              ? 'text-stone-400 hover:text-stone-100'
                              : 'text-stone-600 hover:text-stone-900'
                          }`}
                        >
                          {groupOption}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Compact Tactile Micro-Pill "Now" / "Next" Jump Button (Harmonized h-9) */}
                <button
                  type="button"
                  onClick={handleScrollToNow}
                  title={
                    hasActiveOrRemainingSlotToday
                      ? 'Jump view to current operating hour'
                      : 'Jump view to next scheduled class'
                  }
                  className={`h-9 px-3.5 py-0 text-xs font-semibold leading-none rounded-full inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-150 active:scale-95 border select-none shrink-0 whitespace-nowrap ${
                    isDark
                      ? 'bg-[#1E1D1C] hover:bg-[#262523] text-stone-100 border-transparent'
                      : 'bg-white hover:bg-stone-50 text-stone-900 border-stone-300 shadow-2xs'
                  }`}
                >
                  {hasActiveOrRemainingSlotToday ? (
                    <>
                      <Clock className="w-3.5 h-3.5 shrink-0 text-[#9E2C2C]" />
                      <span className="leading-none">Now</span>
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0 text-[#9E2C2C]" />
                      <span className="leading-none">Next</span>
                    </>
                  )}
                </button>
              </div>
              </>
            )}
          </div>

          <div
            className={`transition-[opacity,transform] duration-300 ease-out delay-[150ms] ${
              isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            {isTermFinalView ? (
              <TermFinalsList
                termFinals={termFinals}
                nowMs={nowMs}
                theme={theme}
                onSelectExam={(exam) => setSelectedEvent(termFinalToRoutineEvent(exam))}
              />
            ) : (
              <MasterTimelineGrid
                days={operationalDays}
                events={events}
                todayName={todayName}
                currentMinuteOffset={currentMinuteOffset}
                onSelectEvent={(evt) => setSelectedEvent(evt)}
                scrollRef={scrollContainerRef}
                theme={theme}
                selectedGroup={selectedGroup}
                highlightedEventKey={highlightedEventKey}
                totalDayMinutes={dynamicTotalDayMinutes}
              />
            )}
          </div>
        </div>
      </main>
      </div>

      {/* Flight Manifest Modal Inspector */}
      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          theme={theme}
        />
      )}

      {/* Active Assignments Bottom Sheet Modal */}
      {isAssignmentsModalOpen && (
        <AssignmentsModal
          assignments={assignments}
          onClose={() => setIsAssignmentsModalOpen(false)}
          theme={theme}
        />
      )}

      {/* Admin PIN Verification Dialog (PIN: 2024 via Triple-Tap) */}
      <AdminPinDialog
        isOpen={isPinDialogOpen}
        onClose={() => setIsPinDialogOpen(false)}
        onSuccess={() => setIsAdminModalOpen(true)}
        theme={theme}
      />

      {/* Hidden Admin Configuration Door Modal */}
      {isAdminModalOpen && (
        <AdminConfigModal
          onClose={() => setIsAdminModalOpen(false)}
          currentUrl={getActiveCsvUrl()}
          onSaveUrl={handleSaveAdminUrl}
          onResetToOfficialDefault={handleResetToOfficialDefault}
          onForceRefresh={() => fetchAndSync()}
          onResetBaseline={handleResetBaseline}
          onOpenExport={() => setIsExportModalOpen(true)}
          syncStatus={syncStatus}
          totalEventsCount={events.length}
          lastSyncTime={lastSyncTime}
          theme={theme}
        />
      )}

      {/* Standalone HTML Exporter (accessible via Admin Config) */}
      <StandaloneHtmlExporter
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        theme={theme}
      />
    </div>
  );
}
