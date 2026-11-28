import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';
import { AnimatePresence, MotionConfig, animate, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { RoutineEvent, RoutineAssignment, TermFinalExam, DEFAULT_ROUTINE_CSV_URL } from './types/routine';
import { baselineTestData } from './data/baselineData';
import {
  DAY_START_MINUTES,
  DAY_END_MINUTES,
  TOTAL_DAY_MINUTES,
  computeDynamicDayEndMinutes,
  formatMinutesTo12Hour,
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
import {
  BOTTOM_SHEET_SPRING,
  BottomSheetMotionContext,
} from './components/BottomSheetModal';
import {
  CARD_INTERACTION_SPRING,
  EASE_OUT_EXPO,
  MICRO_FADE_TRANSITION,
  startupPopTransition,
  startupTextTransition,
  TACTILE_SPRING,
  TIMELINE_SCROLL_SPRING,
  VIEW_TRANSITION,
} from './utils/springs';
import { Clock, ArrowRight } from 'lucide-react';

const GROUP_PILL_SPRING = {
  stiffness: 178,
  damping: 17.6,
  mass: 0.8,
};

const CACHED_ROUTINE_SNAPSHOT_KEY = 'mse24_routine_snapshot_v1';
const CACHED_EVENTS_KEY = 'mse24_cached_routine_events';
const CACHED_ASSIGNMENTS_KEY = 'mse24_cached_routine_assignments';
const CACHED_TERM_FINALS_KEY = 'mse24_cached_routine_term_finals';
const CACHED_SYNC_TIME_KEY = 'mse24_cached_sync_time';
const ADMIN_CSV_URL_KEY = 'admin_routine_csv_url';
const ROUTINE_SNAPSHOT_PARSER_VERSION = 2;
const SYNC_FETCH_TIMEOUT_MS = 15000;

interface CachedRoutineSnapshot {
  events: RoutineEvent[];
  assignments: RoutineAssignment[];
  termFinals: TermFinalExam[];
  lastFetchedAt: number;
  csvHash?: string;
  parserVersion?: number;
}

function hashCsvContent(csvText: string): string {
  let hash = 2166136261;
  for (let i = 0; i < csvText.length; i++) {
    hash ^= csvText.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${csvText.length}:${(hash >>> 0).toString(36)}`;
}

function readCachedRoutineSnapshot(): CachedRoutineSnapshot | null {
  try {
    const raw = localStorage.getItem(CACHED_ROUTINE_SNAPSHOT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.events)) {
        return {
          events: parsed.events,
          assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
          termFinals: Array.isArray(parsed.termFinals) ? parsed.termFinals : [],
          lastFetchedAt: typeof parsed.lastFetchedAt === 'number' ? parsed.lastFetchedAt : 0,
          csvHash: typeof parsed.csvHash === 'string' ? parsed.csvHash : undefined,
          parserVersion: typeof parsed.parserVersion === 'number' ? parsed.parserVersion : undefined,
        };
      }
    }
  } catch (e) {
    console.warn('Failed to load atomic routine snapshot:', e);
  }
  return null;
}

function buildCacheBustedUrl(rawUrl: string): string {
  const cb = String(Date.now());
  try {
    const parsedUrl = new URL(rawUrl);
    parsedUrl.searchParams.set('_cb', cb);
    return parsedUrl.toString();
  } catch {
    const separator = rawUrl.includes('?') ? '&' : '?';
    return `${rawUrl}${separator}_cb=${cb}`;
  }
}

const STALE_SYNC_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes
const VISIBLE_AUTO_REFRESH_MS = 10 * 60 * 1000; // 10 minutes
const THEME_COLOR_FADE_MS = 300;

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

const DAY_SHORT_LABEL: Record<string, string> = {
  Sunday: 'Sun',
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
};

function extractShortCourseCode(subject: string): string {
  if (!subject) return '';
  const colonIdx = subject.indexOf(':');
  return (colonIdx !== -1 ? subject.slice(0, colonIdx) : subject).trim();
}

function formatCourseAndKind(evt: RoutineEvent): string {
  const courseCode = extractShortCourseCode(evt.subject);
  const meta = parseAlternatingSchedule(evt.type, evt.subject, evt.syllabus);
  const typeStatus = `${evt.type || ''} ${evt.status || ''}`.toLowerCase();
  const isExam = meta.category === 'EXAM' || /\b(exam|ct|quiz)\b/.test(typeStatus);
  const isLab = meta.category === 'LAB';
  const eventKind = isExam ? 'exam' : isLab ? 'lab' : 'class';
  return courseCode ? `${courseCode} ${eventKind}` : eventKind;
}

function joinWithAmpersand(parts: string[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} & ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')} & ${parts[parts.length - 1]}`;
}

export default function App() {
  const initialSnapshotRef = useRef<CachedRoutineSnapshot | null | undefined>(undefined);
  if (initialSnapshotRef.current === undefined) {
    initialSnapshotRef.current = readCachedRoutineSnapshot();
  }
  const initialSnapshot = initialSnapshotRef.current;

  // 1. Instant zero-lag cache resolution on mount (atomic snapshot with legacy fallback)
  const [events, setEvents] = useState<RoutineEvent[]>(() => {
    if (initialSnapshot && initialSnapshot.events.length > 0) {
      return initialSnapshot.events;
    }
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
    if (initialSnapshot) {
      return initialSnapshot.assignments;
    }
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
    if (initialSnapshot) {
      return initialSnapshot.termFinals;
    }
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
    if (initialSnapshot && initialSnapshot.lastFetchedAt > 0) {
      return new Date(initialSnapshot.lastFetchedAt).toISOString();
    }
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

  const isBottomSheetOpen = Boolean(
    selectedEvent || isAssignmentsModalOpen || isAdminModalOpen
  );

  const isNonSheetModalOpen = Boolean(isPinDialogOpen || isExportModalOpen);

  const isAnyModalOpen = Boolean(isBottomSheetOpen || isNonSheetModalOpen);

  // Single source of truth for gesture-linked bottom sheet position (`sheetY`) and dismiss range (`sheetHeight`)
  const defaultSheetRange =
    typeof window !== 'undefined' ? Math.round(window.innerHeight * 0.72) : 640;
  const sheetY = useMotionValue<number>(defaultSheetRange);
  const sheetHeight = useMotionValue<number>(defaultSheetRange);
  const dialogDepthProgress = useMotionValue<number>(0);

  // Map sheetY in [0, sheetHeight] -> progress p in [1, 0], strictly clamped so upward over-drag (y < 0) stays locked at 1
  const sheetDepthProgress = useTransform(
    [sheetY, sheetHeight],
    ([y, h]: number[]) => {
      const safeH = Math.max(1, h);
      if (y <= 0) return 1;
      if (y >= safeH) return 0;
      return 1 - y / safeH;
    }
  );

  // Drive dialogDepthProgress smoothly for centered non-sheet dialogs (PIN & HTML Exporter)
  useEffect(() => {
    const controls = animate(dialogDepthProgress, isNonSheetModalOpen ? 1 : 0, BOTTOM_SHEET_SPRING);
    return () => controls.stop();
  }, [isNonSheetModalOpen, dialogDepthProgress]);

  // Unified clamped background focus progress p ∈ [0, 1]
  const depthProgress = useTransform(
    [sheetDepthProgress, dialogDepthProgress],
    ([sp, dp]: number[]) => Math.max(0, Math.min(1, Math.max(sp, dp)))
  );

  const backgroundScale = useTransform(depthProgress, [0, 1], [1, 0.94], { clamp: true });
  const backgroundRadius = useTransform(depthProgress, [0, 1], [0, 20], { clamp: true });
  const backdropOpacity = useTransform(depthProgress, [0, 1], [0, 1], { clamp: true });
  const backdropBlur = useTransform(depthProgress, (v) =>
    v <= 0.004 ? 'blur(0px)' : `blur(${(v * 12).toFixed(2)}px)`
  );
  const backdropVisibility = useTransform(depthProgress, (v) =>
    v > 0.002 ? 'visible' : 'hidden'
  );

  const sheetMotionContextValue = useMemo(
    () => ({ sheetY, sheetHeight }),
    [sheetY, sheetHeight]
  );

  const topScrimOpacity = useMotionValue(0);
  const [jumpIconAnimId, setJumpIconAnimId] = useState(0);

  useEffect(() => {
    const updateTopScrimOpacity = () => {
      const scrollTop = Math.max(
        window.scrollY || 0,
        document.documentElement.scrollTop || 0,
        document.body.scrollTop || 0
      );
      topScrimOpacity.set(Math.min(Math.max(scrollTop / 24, 0), 1));
    };
    updateTopScrimOpacity();
    window.addEventListener('scroll', updateTopScrimOpacity, { passive: true });
    document.addEventListener('scroll', updateTopScrimOpacity, { passive: true, capture: true });
    return () => {
      window.removeEventListener('scroll', updateTopScrimOpacity);
      document.removeEventListener('scroll', updateTopScrimOpacity, { capture: true });
    };
  }, [topScrimOpacity]);

  const closeAllModals = () => {
    setSelectedEvent(null);
    setIsAssignmentsModalOpen(false);
    setIsAdminModalOpen(false);
    setIsPinDialogOpen(false);
    setIsExportModalOpen(false);
  };

  // Bulletproof background scroll lock tied strictly to modal visibility (locks html + body + wheel + touchmove)
  useEffect(() => {
    if (!isAnyModalOpen) return;
    const html = document.documentElement;
    const body = document.body;

    const prevHtmlOverflow = html.style.overflow;
    const prevHtmlOverscroll = html.style.overscrollBehavior;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyOverscroll = body.style.overscrollBehavior;
    const prevBodyTouchAction = body.style.touchAction;

    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    body.style.touchAction = 'none';

    const findScrollableModalAncestor = (target: EventTarget | null): HTMLElement | null => {
      let node: Element | null = target instanceof Element ? target : null;
      while (node) {
        if (node instanceof HTMLElement && node.dataset.modalScrollable === 'true') {
          const overflowY = window.getComputedStyle(node).overflowY;
          if (
            (overflowY === 'auto' || overflowY === 'scroll') &&
            node.scrollHeight > node.clientHeight + 1
          ) {
            return node;
          }
        }
        node = node.parentElement;
      }
      return null;
    };

    const handleWheel = (e: WheelEvent) => {
      const scrollable = findScrollableModalAncestor(e.target);
      if (!scrollable) {
        e.preventDefault();
        return;
      }
      const atTop = scrollable.scrollTop <= 0 && e.deltaY < 0;
      const atBottom =
        scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 1 &&
        e.deltaY > 0;
      if (atTop || atBottom) {
        e.preventDefault();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const scrollable = findScrollableModalAncestor(e.target);
      if (!scrollable) {
        e.preventDefault();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchmove', handleTouchMove);
      html.style.overflow = prevHtmlOverflow;
      html.style.overscrollBehavior = prevHtmlOverscroll;
      body.style.overflow = prevBodyOverflow;
      body.style.overscrollBehavior = prevBodyOverscroll;
      body.style.touchAction = prevBodyTouchAction;
    };
  }, [isAnyModalOpen]);

  // Capture viewport-centered transformOrigin synchronously on modal open (no extra re-render mid-spring)
  const prevModalOpenRef = useRef(false);
  const canvasOriginYRef = useRef<number>(300);
  if (isAnyModalOpen && !prevModalOpenRef.current && typeof window !== 'undefined') {
    canvasOriginYRef.current = Math.round(window.scrollY + window.innerHeight * 0.42);
  }
  prevModalOpenRef.current = isAnyModalOpen;

  const isDark = theme === 'dark';
  const currentThemeColorRef = useRef<string | null>(null);
  const themeColorRafRef = useRef<number | null>(null);
  const themeTransitionIdRef = useRef<number>(0);
  const themeFadeTimerRef = useRef<number | null>(null);
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
      if (themeFadeTimerRef.current !== null) {
        window.clearTimeout(themeFadeTimerRef.current);
      }
      document.documentElement.classList.remove('theme-switching', 'theme-fading');
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
        ? '#0C0C0B'
        : '#181716'
      : isAnyModalOpen
      ? '#868683'
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

    // Apply immediately on initial mount or when already at target
    if (!fromColor || fromColor.toLowerCase() === targetColor.toLowerCase()) {
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

  const handleToggleTheme = (e?: React.MouseEvent<HTMLButtonElement>) => {
    const root = document.documentElement;
    const nextTheme: 'light' | 'dark' = theme === 'dark' ? 'light' : 'dark';
    const transitionId = ++themeTransitionIdRef.current;

    if (themeSwitchRafRef.current.outer !== null) {
      cancelAnimationFrame(themeSwitchRafRef.current.outer);
      themeSwitchRafRef.current.outer = null;
    }
    if (themeSwitchRafRef.current.inner !== null) {
      cancelAnimationFrame(themeSwitchRafRef.current.inner);
      themeSwitchRafRef.current.inner = null;
    }
    if (themeFadeTimerRef.current !== null) {
      window.clearTimeout(themeFadeTimerRef.current);
      themeFadeTimerRef.current = null;
    }

    const applyThemeDom = () => {
      root.classList.toggle('dark', nextTheme === 'dark');
      root.style.colorScheme = nextTheme;
      setTheme(nextTheme);
    };

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      root.classList.remove('theme-fading');
      root.classList.add('theme-switching');
      applyThemeDom();
      themeSwitchRafRef.current.outer = requestAnimationFrame(() => {
        themeSwitchRafRef.current.outer = null;
        themeSwitchRafRef.current.inner = requestAnimationFrame(() => {
          themeSwitchRafRef.current.inner = null;
          if (themeTransitionIdRef.current === transitionId) {
            root.classList.remove('theme-switching');
          }
        });
      });
      return;
    }

    // Modern browsers: circular radial reveal expanding smoothly from the Theme Toggle button
    const startViewTransition = (
      document as Document & {
        startViewTransition?: (cb: () => void) => {
          ready: Promise<void>;
          finished: Promise<void>;
        };
      }
    ).startViewTransition;

    if (typeof startViewTransition === 'function') {
      let originX = window.innerWidth - 36;
      let originY = 36;
      if (e?.currentTarget) {
        const rect = e.currentTarget.getBoundingClientRect();
        originX = rect.left + rect.width / 2;
        originY = rect.top + rect.height / 2;
      }

      const endRadius = Math.hypot(
        Math.max(originX, window.innerWidth - originX),
        Math.max(originY, window.innerHeight - originY)
      );

      root.classList.remove('theme-fading');
      root.classList.add('theme-switching');

      try {
        const vt = startViewTransition.call(document, () => {
          flushSync(() => {
            applyThemeDom();
          });
        });

        vt.ready
          .then(() => {
            document.documentElement.animate(
              {
                clipPath: [
                  `circle(0px at ${originX}px ${originY}px)`,
                  `circle(${endRadius}px at ${originX}px ${originY}px)`,
                ],
              },
              {
                duration: 480,
                easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                pseudoElement: '::view-transition-new(root)',
              }
            );
          })
          .catch(() => {
            // Ignore aborted transition if toggled rapidly
          });

        vt.finished
          .catch(() => {})
          .finally(() => {
            if (themeTransitionIdRef.current === transitionId) {
              root.classList.remove('theme-switching');
            }
          });
        return;
      } catch {
        root.classList.remove('theme-switching');
      }
    }

    // Fallback: synchronized smooth color crossfade across all elements
    root.classList.remove('theme-switching');
    root.classList.add('theme-fading');
    applyThemeDom();
    themeFadeTimerRef.current = window.setTimeout(() => {
      themeFadeTimerRef.current = null;
      if (themeTransitionIdRef.current === transitionId) {
        root.classList.remove('theme-fading');
      }
    }, 340);
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
    setPressedGroup(null);
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
  const [highlightedSlot, setHighlightedSlot] = useState<{
    key: string;
    seq: number;
    phase: 'lifted' | 'settling';
  } | null>(null);
  const highlightSeqRef = useRef<number>(0);
  const highlightTimerRef = useRef<number | null>(null);
  const highlightClearTimerRef = useRef<number | null>(null);

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

  // Sliding pill measurement for Group Toggle (unscaled local layout coordinates)
  const shouldReduceMotion = useReducedMotion();
  const groupTrackRef = useRef<HTMLDivElement | null>(null);
  const groupTabRefs = useRef<Record<'All' | 'Group A' | 'Group B', HTMLButtonElement | null>>({
    All: null,
    'Group A': null,
    'Group B': null,
  });
  const [hoveredGroup, setHoveredGroup] = useState<'All' | 'Group A' | 'Group B' | null>(null);
  const [pressedGroup, setPressedGroup] = useState<'All' | 'Group A' | 'Group B' | null>(null);
  const hasInitializedGroupPillRef = useRef(false);
  const prevSelectedGroupRef = useRef<'All' | 'Group A' | 'Group B'>(selectedGroup);
  const prevPreviewGroupRef = useRef<'All' | 'Group A' | 'Group B' | null>(null);
  const lastGroupPillBoundsRef = useRef<{ trackWidth: number; left: number; right: number }>({
    trackWidth: 0,
    left: -1,
    right: -1,
  });
  const [isGroupPillReady, setIsGroupPillReady] = useState(false);

  const groupTrackWidthMV = useMotionValue(0);
  const groupPillLeft = useSpring(0, GROUP_PILL_SPRING);
  const groupPillRight = useSpring(0, GROUP_PILL_SPRING);

  const clampedGroupPillX = useTransform(
    [groupPillLeft, groupPillRight, groupTrackWidthMV],
    ([l, r, tw]: number[]) => {
      if (tw <= 0) return 0;
      const safeLeft = Math.max(0, Math.min(l, tw));
      const safeRight = Math.max(0, Math.min(r, tw));
      return Math.min(safeLeft, safeRight);
    }
  );

  const clampedGroupPillWidth = useTransform(
    [groupPillLeft, groupPillRight, groupTrackWidthMV],
    ([l, r, tw]: number[]) => {
      if (tw <= 0) return 0;
      const safeLeft = Math.max(0, Math.min(l, tw));
      const safeRight = Math.max(0, Math.min(r, tw));
      return Math.max(0, safeRight - safeLeft);
    }
  );

  useEffect(() => {
    if (!pressedGroup) return;
    let releaseTimerId: number | null = null;
    const clearPressed = () => {
      // Defer one tick so onClick transitions directly from stretched press state to full glide
      releaseTimerId = window.setTimeout(() => {
        setPressedGroup(null);
      }, 0);
    };
    const clearImmediate = () => {
      if (releaseTimerId !== null) window.clearTimeout(releaseTimerId);
      setPressedGroup(null);
    };
    window.addEventListener('pointerup', clearPressed, { passive: true });
    window.addEventListener('pointercancel', clearImmediate, { passive: true });
    return () => {
      if (releaseTimerId !== null) window.clearTimeout(releaseTimerId);
      window.removeEventListener('pointerup', clearPressed);
      window.removeEventListener('pointercancel', clearImmediate);
    };
  }, [pressedGroup]);

  useLayoutEffect(() => {
    if (isTermFinalView) {
      hasInitializedGroupPillRef.current = false;
      setHoveredGroup(null);
      setPressedGroup(null);
      return;
    }

    const previewGroup =
      pressedGroup && pressedGroup !== selectedGroup
        ? pressedGroup
        : hoveredGroup && hoveredGroup !== selectedGroup
        ? hoveredGroup
        : null;

    const syncPillToActiveTab = (shouldAnimate: boolean, onlyIfLayoutChanged = false) => {
      const trackEl = groupTrackRef.current;
      const activeEl = groupTabRefs.current[selectedGroup];
      if (!trackEl || !activeEl) return;

      const trackWidth = trackEl.offsetWidth;
      if (trackWidth <= 0) return;

      const activeLeft = Math.max(0, activeEl.offsetLeft);
      const activeRight = Math.min(trackWidth, activeLeft + activeEl.offsetWidth);
      let targetLeft = activeLeft;
      let targetRight = activeRight;

      if (previewGroup) {
        const previewEl = groupTabRefs.current[previewGroup];
        if (previewEl) {
          const activeCenter = activeLeft + activeEl.offsetWidth / 2;
          const previewLeft = Math.max(0, previewEl.offsetLeft);
          const previewCenter = previewLeft + previewEl.offsetWidth / 2;
          const centerDistance = Math.abs(previewCenter - activeCenter);
          // Subtle anticipatory stretch scaling with distance before full glide
          const stretchPx = Math.min(7.5, centerDistance * 0.052);

          if (previewCenter > activeCenter) {
            targetRight = Math.min(trackWidth, activeRight + stretchPx);
          } else {
            targetLeft = Math.max(0, activeLeft - stretchPx);
          }
        }
      }

      const prevBounds = lastGroupPillBoundsRef.current;
      if (
        onlyIfLayoutChanged &&
        prevBounds.trackWidth === trackWidth &&
        prevBounds.left === targetLeft &&
        prevBounds.right === targetRight
      ) {
        return;
      }

      lastGroupPillBoundsRef.current = {
        trackWidth,
        left: targetLeft,
        right: targetRight,
      };
      groupTrackWidthMV.set(trackWidth);

      if (!hasInitializedGroupPillRef.current || !shouldAnimate || shouldReduceMotion) {
        groupPillLeft.jump(targetLeft);
        groupPillRight.jump(targetRight);
        hasInitializedGroupPillRef.current = true;
      } else {
        groupPillLeft.set(targetLeft);
        groupPillRight.set(targetRight);
      }

      setIsGroupPillReady((prev) => (prev ? prev : true));
    };

    const groupChanged = prevSelectedGroupRef.current !== selectedGroup;
    const previewChanged = prevPreviewGroupRef.current !== previewGroup;
    prevSelectedGroupRef.current = selectedGroup;
    prevPreviewGroupRef.current = previewGroup;

    syncPillToActiveTab(groupChanged || previewChanged);

    const handleResize = () => syncPillToActiveTab(false, true);
    window.addEventListener('resize', handleResize);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && groupTrackRef.current) {
      observer = new ResizeObserver(handleResize);
      observer.observe(groupTrackRef.current);
    }

    let cancelled = false;
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!cancelled) syncPillToActiveTab(false, true);
      });
    }

    return () => {
      cancelled = true;
      window.removeEventListener('resize', handleResize);
      observer?.disconnect();
    };
  }, [selectedGroup, hoveredGroup, pressedGroup, isTermFinalView, shouldReduceMotion, groupPillLeft, groupPillRight, groupTrackWidthMV]);

  const [hasCompletedInitialMount, setHasCompletedInitialMount] = useState(false);
  const initialTermFinalViewRef = useRef(isTermFinalView);
  const [hasSwitchedScheduleView, setHasSwitchedScheduleView] = useState(false);
  const isColdScheduleStartup =
    !hasSwitchedScheduleView && isTermFinalView === initialTermFinalViewRef.current;

  useEffect(() => {
    setHasCompletedInitialMount(true);
  }, []);

  useEffect(() => {
    if (isTermFinalView !== initialTermFinalViewRef.current) {
      setHasSwitchedScheduleView(true);
    }
  }, [isTermFinalView]);

  const scrollAnimationRef = useRef<{ stop: () => void } | null>(null);
  const scrollCleanupRef = useRef<(() => void) | null>(null);

  const springScrollTimeline = (
    container: HTMLElement,
    targetScroll: number,
    onArrived?: () => void
  ) => {
    if (scrollAnimationRef.current) {
      scrollAnimationRef.current.stop();
      scrollAnimationRef.current = null;
    }
    if (scrollCleanupRef.current) {
      scrollCleanupRef.current();
      scrollCleanupRef.current = null;
    }

    const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
    const clampedTarget = Math.max(0, Math.min(maxScroll, targetScroll));
    const startScroll = container.scrollLeft;

    if (Math.abs(clampedTarget - startScroll) < 1) {
      container.scrollLeft = clampedTarget;
      onArrived?.();
      return;
    }

    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      container.scrollLeft = clampedTarget;
      onArrived?.();
      return;
    }

    let hasReportedArrival = false;
    const notifyArrived = () => {
      if (hasReportedArrival) return;
      hasReportedArrival = true;
      onArrived?.();
    };

    const cancelOnUserInteract = () => {
      if (scrollAnimationRef.current) {
        scrollAnimationRef.current.stop();
        scrollAnimationRef.current = null;
      }
      if (scrollCleanupRef.current) {
        scrollCleanupRef.current();
        scrollCleanupRef.current = null;
      }
      notifyArrived();
    };

    const cleanupListeners = () => {
      container.removeEventListener('wheel', cancelOnUserInteract);
      container.removeEventListener('touchstart', cancelOnUserInteract);
      container.removeEventListener('pointerdown', cancelOnUserInteract);
    };

    scrollCleanupRef.current = cleanupListeners;
    container.addEventListener('wheel', cancelOnUserInteract, { passive: true, once: true });
    container.addEventListener('touchstart', cancelOnUserInteract, { passive: true, once: true });
    container.addEventListener('pointerdown', cancelOnUserInteract, { passive: true, once: true });

    const controls = animate(startScroll, clampedTarget, {
      ...TIMELINE_SCROLL_SPRING,
      onUpdate: (latest) => {
        container.scrollLeft = latest;
      },
      onComplete: () => {
        if (scrollCleanupRef.current === cleanupListeners) {
          cleanupListeners();
          scrollCleanupRef.current = null;
        }
        if (scrollAnimationRef.current === controls) {
          scrollAnimationRef.current = null;
        }
        notifyArrived();
      },
    });

    scrollAnimationRef.current = controls;
  };

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
      }
      if (highlightClearTimerRef.current !== null) {
        window.clearTimeout(highlightClearTimerRef.current);
      }
      if (scrollAnimationRef.current) {
        scrollAnimationRef.current.stop();
        scrollAnimationRef.current = null;
      }
      if (scrollCleanupRef.current) {
        scrollCleanupRef.current();
        scrollCleanupRef.current = null;
      }
    };
  }, []);

  /**
   * Active CSV URL cached in React state (avoiding per-render localStorage reads)
   */
  const [activeCsvUrl, setActiveCsvUrl] = useState<string>(() => {
    try {
      const custom = localStorage.getItem(ADMIN_CSV_URL_KEY);
      if (custom && custom.trim().length > 0) {
        return custom.trim();
      }
    } catch (e) {
      console.warn('Failed to read admin CSV url from localStorage:', e);
    }
    return DEFAULT_ROUTINE_CSV_URL;
  });

  const activeCsvUrlRef = useRef<string>(activeCsvUrl);
  activeCsvUrlRef.current = activeCsvUrl;

  const isSyncInFlightRef = useRef(false);
  const syncGenerationRef = useRef(0);
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const eventsRef = useRef<RoutineEvent[]>(events);
  eventsRef.current = events;
  const assignmentsRef = useRef<RoutineAssignment[]>(assignments);
  assignmentsRef.current = assignments;
  const termFinalsRef = useRef<TermFinalExam[]>(termFinals);
  termFinalsRef.current = termFinals;

  const lastCsvHashRef = useRef<string | null>(
    initialSnapshot &&
      initialSnapshot.parserVersion === ROUTINE_SNAPSHOT_PARSER_VERSION &&
      initialSnapshot.csvHash
      ? initialSnapshot.csvHash
      : null
  );

  const lastSyncAtRef = useRef<number>((() => {
    if (initialSnapshot && initialSnapshot.lastFetchedAt > 0) {
      return initialSnapshot.lastFetchedAt;
    }
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
   * Race-Safe Single-Table Sync & Atomic Snapshot Engine
   * - Appends unique `_cb` timestamp, enforces 15s timeout, and uses `{ cache: 'no-store' }`
   * - Guards against out-of-order responses via monotonic syncGenerationRef + AbortController
   * - Skips CSV parsing, differential logging, and React re-renders when payload hash is unchanged
   */
  const fetchAndSync = async (targetUrl?: string, isSilent = false): Promise<void> => {
    const url = (targetUrl !== undefined ? targetUrl : activeCsvUrlRef.current).trim();
    if (!url) {
      if (!isSilent) setSyncStatus({ status: 'error', message: 'ERROR: EMPTY_ENDPOINT_URL' });
      return;
    }

    if (isSilent && isSyncInFlightRef.current) {
      return;
    }

    // Manual or explicit sync supersedes any older in-flight background request
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
      activeAbortControllerRef.current = null;
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    activeAbortControllerRef.current = controller;
    let didTimeout = false;
    const timeoutId =
      controller !== null
        ? window.setTimeout(() => {
            didTimeout = true;
            controller.abort();
          }, SYNC_FETCH_TIMEOUT_MS)
        : null;

    const reqId = ++syncGenerationRef.current;
    isSyncInFlightRef.current = true;
    if (!isSilent) {
      setSyncStatus({ status: 'syncing', message: 'FETCHING_STREAM...' });
    }

    try {
      const fetchUrl = buildCacheBustedUrl(url);
      const res = await fetch(fetchUrl, {
        cache: 'no-store',
        signal: controller?.signal,
      });

      if (reqId !== syncGenerationRef.current) return;
      if (!res.ok) throw new Error(`HTTP_${res.status}`);

      const csvText = await res.text();
      if (reqId !== syncGenerationRef.current) return;

      const csvHash = hashCsvContent(csvText);
      const syncCompletedMs = Date.now();
      const nowISO = new Date(syncCompletedMs).toISOString();

      // Fast no-op path: payload is byte-for-byte identical to our current parsed snapshot
      if (lastCsvHashRef.current !== null && csvHash === lastCsvHashRef.current) {
        lastSyncAtRef.current = syncCompletedMs;
        setLastSyncTime(nowISO);
        try {
          const unchangedSnapshot: CachedRoutineSnapshot = {
            events: eventsRef.current,
            assignments: assignmentsRef.current,
            termFinals: termFinalsRef.current,
            lastFetchedAt: syncCompletedMs,
            csvHash,
            parserVersion: ROUTINE_SNAPSHOT_PARSER_VERSION,
          };
          localStorage.setItem(CACHED_ROUTINE_SNAPSHOT_KEY, JSON.stringify(unchangedSnapshot));
        } catch (e) {
          console.warn('Failed to update sync timestamp in localStorage:', e);
        }
        if (!isSilent) {
          setSyncStatus({
            status: 'success',
            message: `SYNC_OK: ${eventsRef.current.length}_CLASSES · UP_TO_DATE`,
          });
        }
        return;
      }

      const rawRows = parseCSV(csvText);
      const {
        events: parsed,
        assignments: parsedAssignments,
        termFinals: parsedTermFinals,
      } = parseRoutineCSVRows(rawRows);
      if (parsed.length === 0 && parsedAssignments.length === 0 && parsedTermFinals.length === 0) {
        throw new Error('NO_VALID_DATA_ROWS');
      }

      if (reqId !== syncGenerationRef.current) return;

      const nextEvents = parsed.length > 0 ? parsed : eventsRef.current;

      // Single atomic localStorage snapshot write (and clean up redundant legacy keys)
      const atomicSnapshot: CachedRoutineSnapshot = {
        events: nextEvents,
        assignments: parsedAssignments,
        termFinals: parsedTermFinals,
        lastFetchedAt: syncCompletedMs,
        csvHash,
        parserVersion: ROUTINE_SNAPSHOT_PARSER_VERSION,
      };

      try {
        localStorage.setItem(CACHED_ROUTINE_SNAPSHOT_KEY, JSON.stringify(atomicSnapshot));
        localStorage.removeItem(CACHED_EVENTS_KEY);
        localStorage.removeItem(CACHED_ASSIGNMENTS_KEY);
        localStorage.removeItem(CACHED_TERM_FINALS_KEY);
        localStorage.removeItem(CACHED_SYNC_TIME_KEY);
      } catch (e) {
        console.warn('Failed to cache routine snapshot to localStorage:', e);
      }

      lastCsvHashRef.current = csvHash;
      lastSyncAtRef.current = syncCompletedMs;
      setEvents(nextEvents);
      setAssignments(parsedAssignments);
      setTermFinals(parsedTermFinals);
      setLastSyncTime(nowISO);

      // Run differential changelog engine: diff against snapshot
      const { newLogsCount } = processDifferentialLogs(nextEvents);

      setSyncStatus({
        status: 'success',
        message: `SYNC_OK: ${nextEvents.length}_CLASSES · ${newLogsCount}_DIFFS_RECORDED`,
      });
    } catch (err: any) {
      if (reqId !== syncGenerationRef.current) {
        return;
      }
      if (err?.name === 'AbortError' && !didTimeout) {
        return;
      }
      const errMessage = didTimeout ? 'REQUEST_TIMEOUT' : err?.message || 'NETWORK_OR_CORS_ERROR';
      console.warn('[fetchAndSync] Execution failed:', errMessage, err);
      if (!isSilent) {
        setSyncStatus({
          status: 'error',
          message: `FAILED: ${errMessage}`,
        });
      }
    } finally {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      if (reqId === syncGenerationRef.current) {
        isSyncInFlightRef.current = false;
        if (activeAbortControllerRef.current === controller) {
          activeAbortControllerRef.current = null;
        }
      }
    }
  };

  const fetchAndSyncRef = useRef(fetchAndSync);
  fetchAndSyncRef.current = fetchAndSync;

  // Smart silent background auto-refresh:
  // - Initial silent sync on mount
  // - Stale check (> 3 min) on visibilitychange (visible), window focus, & network reconnect
  // - 10-minute interval active strictly while tab/app is visible
  useEffect(() => {
    fetchAndSyncRef.current(activeCsvUrlRef.current, true);

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

    const handleOnline = () => {
      triggerSilentSyncIfStale();
    };

    if (document.visibilityState === 'visible') {
      startVisiblePolling();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      stopVisiblePolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const handleSaveAdminUrl = (newUrl: string) => {
    const resolvedUrl = newUrl || DEFAULT_ROUTINE_CSV_URL;
    try {
      if (!newUrl || newUrl === DEFAULT_ROUTINE_CSV_URL) {
        localStorage.removeItem(ADMIN_CSV_URL_KEY);
      } else {
        localStorage.setItem(ADMIN_CSV_URL_KEY, newUrl);
      }
    } catch (e) {
      console.warn('Failed to save admin CSV URL:', e);
    }
    lastCsvHashRef.current = null;
    setActiveCsvUrl(resolvedUrl);
    fetchAndSync(resolvedUrl);
  };

  const handleResetToOfficialDefault = () => {
    try {
      localStorage.removeItem(ADMIN_CSV_URL_KEY);
    } catch (e) {
      console.warn('Failed to remove custom admin CSV URL:', e);
    }
    lastCsvHashRef.current = null;
    setActiveCsvUrl(DEFAULT_ROUTINE_CSV_URL);
    fetchAndSync(DEFAULT_ROUTINE_CSV_URL);
  };

  const handleResetBaseline = () => {
    try {
      localStorage.removeItem(CACHED_ROUTINE_SNAPSHOT_KEY);
      localStorage.removeItem(CACHED_EVENTS_KEY);
      localStorage.removeItem(CACHED_ASSIGNMENTS_KEY);
      localStorage.removeItem(CACHED_TERM_FINALS_KEY);
      localStorage.removeItem(CACHED_SYNC_TIME_KEY);
    } catch (e) {
      console.warn('Failed to clear cached events:', e);
    }
    lastCsvHashRef.current = null;
    lastSyncAtRef.current = 0;
    setLastSyncTime(null);
    setEvents(baselineTestData);
    setAssignments([]);
    setTermFinals([]);
    setViewOverride(null);
    processDifferentialLogs(baselineTestData);
    setSyncStatus({ status: 'idle', message: 'BASELINE_DEFAULT_RESTORED' });
  };

  // Dynamic Saturday row & dynamic right-edge end time (memoized across clock ticks)
  const operationalDays = useMemo<
    Array<'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Saturday'>
  >(() => {
    const hasActiveSaturdayEvents = events.some((evt) => {
      if (evt.day.toLowerCase() !== 'saturday') return false;
      const status = (evt.status || '').trim().toLowerCase();
      return status !== 'cancelled' && status !== 'canceled' && Boolean((evt.subject || '').trim());
    });
    return hasActiveSaturdayEvents ? [...BASE_OPERATIONAL_DAYS, 'Saturday'] : BASE_OPERATIONAL_DAYS;
  }, [events]);

  const dynamicDayEndMinutes = useMemo(() => computeDynamicDayEndMinutes(events), [events]);
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

  // Out-of-the-ordinary detection across all active routine events (respecting selected group):
  // - hasSaturday: any active event scheduled on Saturday
  // - hasLateEvent: any active event with start time >= 5:00 PM (17 * 60)
  //   (regular periods ending at 5:00 PM like 4:10 PM – 5:00 PM do NOT trigger this)
  const outOfOrdinaryNotice = (() => {
    interface OffRoutineEntry {
      evt: RoutineEvent;
      key: string;
      day: string;
      dayShort: string;
      startMins: number;
      exactTime: string;
      courseAndKind: string;
      isSaturday: boolean;
      isLate: boolean;
      orderScore: number;
    }

    const saturdayEntries: OffRoutineEntry[] = [];
    const lateEntries: OffRoutineEntry[] = [];
    const lateWeekdayEntries: OffRoutineEntry[] = [];

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
        const isLate = startMins >= DAY_END_MINUTES; // >= 17 * 60 (5:00 PM)
        if (!isSaturday && !isLate) return;

        const dayNum = DAY_TO_WEEKDAY_NUM[evt.day] ?? 0;
        const entry: OffRoutineEntry = {
          evt,
          key: evt.id || `${day}-${evt.startTime}-${idx}`,
          day: evt.day,
          dayShort: DAY_SHORT_LABEL[evt.day] || evt.day.slice(0, 3),
          startMins,
          exactTime: formatMinutesTo12Hour(startMins),
          courseAndKind: formatCourseAndKind(evt),
          isSaturday,
          isLate,
          orderScore: dayNum * 1440 + startMins,
        };

        if (isSaturday) saturdayEntries.push(entry);
        if (isLate) lateEntries.push(entry);
        if (isLate && !isSaturday) lateWeekdayEntries.push(entry);
      });
    });

    saturdayEntries.sort((a, b) => a.orderScore - b.orderScore);
    lateEntries.sort((a, b) => a.orderScore - b.orderScore);
    lateWeekdayEntries.sort((a, b) => a.orderScore - b.orderScore);

    const hasSaturday = saturdayEntries.length > 0;
    const hasLateEvent = lateEntries.length > 0;

    if (!hasSaturday && !hasLateEvent) {
      return null;
    }

    const formatLateListSummary = (entries: OffRoutineEntry[], capitalizePrefix: boolean): string => {
      if (entries.length === 1) {
        const item = entries[0];
        return `${item.courseAndKind} at ${item.exactTime} on ${item.day}`;
      }
      const prefix = capitalizePrefix ? 'Events' : 'events';
      return `${prefix} at ${joinWithAmpersand(
        entries.map((item) => `${item.exactTime} (${item.dayShort})`)
      )}`;
    };

    const formatSaturdaySummary = (entries: OffRoutineEntry[]): string => {
      if (entries.length === 1) {
        const item = entries[0];
        return item.isLate
          ? `${item.courseAndKind} at ${item.exactTime} on Saturday`
          : `${item.courseAndKind} on Saturday`;
      }
      const anyLateOnSaturday = entries.some((item) => item.isLate);
      if (entries.length === 2 && !anyLateOnSaturday) {
        return `${entries[0].courseAndKind} & ${entries[1].courseAndKind} on Saturday`;
      }
      if (anyLateOnSaturday) {
        const satLateTimes = joinWithAmpersand(
          entries.filter((item) => item.isLate).map((item) => item.exactTime)
        );
        return `${entries.length} events on Saturday (incl. ${satLateTimes})`;
      }
      return `${entries.length} events on Saturday`;
    };

    let label = '';
    if (hasSaturday && !hasLateEvent) {
      label = formatSaturdaySummary(saturdayEntries);
    } else if (!hasSaturday && hasLateEvent) {
      label = formatLateListSummary(lateEntries, true);
    } else {
      // Both hasSaturday and hasLateEvent
      if (lateWeekdayEntries.length === 0) {
        // Every late event is itself on Saturday
        label = formatSaturdaySummary(saturdayEntries);
      } else {
        const satPart = formatSaturdaySummary(saturdayEntries);
        const latePart = formatLateListSummary(lateWeekdayEntries, false);
        label = `${satPart} & ${latePart}`;
      }
    }

    // Choose the nearest upcoming off-routine slot to jump to on click
    const nowDate = new Date(nowMs);
    const todayDayNum = nowDate.getDay();
    const currentMins = nowDate.getHours() * 60 + nowDate.getMinutes();
    const allTargets = [...saturdayEntries, ...lateWeekdayEntries];
    allTargets.sort((a, b) => {
      const getUpcomingScore = (item: OffRoutineEntry) => {
        const targetDayNum = DAY_TO_WEEKDAY_NUM[item.day] ?? 0;
        let dayDiff = (targetDayNum - todayDayNum + 7) % 7;
        if (dayDiff === 0 && currentMins >= item.startMins) dayDiff = 7;
        return dayDiff * 1440 + item.startMins;
      };
      return getUpcomingScore(a) - getUpcomingScore(b);
    });

    const primaryTarget = allTargets[0];
    return {
      label,
      primaryTarget: { evt: primaryTarget.evt, key: primaryTarget.key },
    };
  })();

  const MAX_HIGHLIGHT_DWELL_MS = 800;
  const MIN_HIGHLIGHT_DWELL_MS = 160;

  const computeHighlightDwellMs = (distancePx: number, referenceSpanPx: number): number => {
    if (!Number.isFinite(distancePx) || distancePx <= 1) {
      return MAX_HIGHLIGHT_DWELL_MS;
    }
    const safeSpan = Math.max(1, referenceSpanPx);
    const normalizedDistance = Math.max(0, Math.min(1, distancePx / safeSpan));
    return Math.round(
      MAX_HIGHLIGHT_DWELL_MS -
        normalizedDistance * (MAX_HIGHLIGHT_DWELL_MS - MIN_HIGHLIGHT_DWELL_MS)
    );
  };

  const beginSlotHighlight = (
    eventKey: string,
    dwellMs: number = MAX_HIGHLIGHT_DWELL_MS
  ): (() => void) => {
    if (highlightTimerRef.current !== null) {
      window.clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
    if (highlightClearTimerRef.current !== null) {
      window.clearTimeout(highlightClearTimerRef.current);
      highlightClearTimerRef.current = null;
    }

    const seq = ++highlightSeqRef.current;
    setHighlightedSlot({ key: eventKey, seq, phase: 'lifted' });

    const clampedDwellMs = Math.max(0, Math.min(MAX_HIGHLIGHT_DWELL_MS, dwellMs));
    let arrived = false;
    return () => {
      if (arrived || highlightSeqRef.current !== seq) return;
      arrived = true;

      highlightTimerRef.current = window.setTimeout(() => {
        highlightTimerRef.current = null;
        if (highlightSeqRef.current !== seq) return;

        setHighlightedSlot((prev) =>
          prev && prev.seq === seq ? { ...prev, phase: 'settling' } : prev
        );

        highlightClearTimerRef.current = window.setTimeout(() => {
          highlightClearTimerRef.current = null;
          if (highlightSeqRef.current !== seq) return;
          setHighlightedSlot((prev) => (prev && prev.seq === seq ? null : prev));
        }, 1050);
      }, clampedDwellMs);
    };
  };

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
      const deltaX = Math.abs(targetScroll - container.scrollLeft);

      const rowEl = container.querySelector<HTMLElement>(
        `[data-day="${target.evt.day.toLowerCase()}"]`
      );
      const rect = rowEl?.getBoundingClientRect();
      const deltaY = rect
        ? rect.top < 0
          ? -rect.top
          : rect.bottom > window.innerHeight
          ? rect.bottom - window.innerHeight
          : 0
        : 0;
      const needsVerticalScroll = deltaY > 0;

      const viewportDistancePx = Math.hypot(deltaX, deltaY);
      const referenceSpanPx = Math.max(maxScroll, container.clientWidth * 0.85, 360);
      const dwellMs = computeHighlightDwellMs(viewportDistancePx, referenceSpanPx);
      const markViewportArrived = beginSlotHighlight(target.key, dwellMs);

      let horizontalDone = false;
      let verticalDone = !needsVerticalScroll;
      const checkBothArrived = () => {
        if (horizontalDone && verticalDone) {
          markViewportArrived();
        }
      };

      if (needsVerticalScroll && rowEl) {
        rowEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        let verticalDebounceId: number | null = null;
        let verticalCapId: number | null = null;
        const finishVertical = () => {
          if (verticalDone) return;
          verticalDone = true;
          window.removeEventListener('scroll', onWindowScroll);
          if (verticalDebounceId !== null) window.clearTimeout(verticalDebounceId);
          if (verticalCapId !== null) window.clearTimeout(verticalCapId);
          checkBothArrived();
        };
        const onWindowScroll = () => {
          if (verticalDebounceId !== null) window.clearTimeout(verticalDebounceId);
          verticalDebounceId = window.setTimeout(finishVertical, 120);
        };
        window.addEventListener('scroll', onWindowScroll, { passive: true });
        verticalDebounceId = window.setTimeout(finishVertical, 200);
        verticalCapId = window.setTimeout(finishVertical, 480);
      }

      springScrollTimeline(container, targetScroll, () => {
        horizontalDone = true;
        checkBothArrived();
      });
    } else {
      const markViewportArrived = beginSlotHighlight(target.key, MAX_HIGHLIGHT_DWELL_MS);
      markViewportArrived();
    }
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
      const referenceSpanPx = Math.max(maxScroll, container.clientWidth * 0.85, 360);

      if (hasActiveOrRemainingSlotToday && currentMinuteOffset !== null) {
        const focusX = (currentMinuteOffset / dynamicTotalDayMinutes) * container.scrollWidth;
        const targetScroll = Math.max(0, Math.min(maxScroll, focusX - container.clientWidth / 2));
        const deltaX = Math.abs(targetScroll - container.scrollLeft);
        const dwellMs = computeHighlightDwellMs(deltaX, referenceSpanPx);
        const markViewportArrived = targetSlot
          ? beginSlotHighlight(targetSlot.key, dwellMs)
          : undefined;
        springScrollTimeline(container, targetScroll, markViewportArrived);
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
        const deltaX = Math.abs(targetScroll - container.scrollLeft);
        const dwellMs = computeHighlightDwellMs(deltaX, referenceSpanPx);
        const markViewportArrived = beginSlotHighlight(targetSlot.key, dwellMs);
        springScrollTimeline(container, targetScroll, markViewportArrived);
      } else {
        springScrollTimeline(container, Math.min(240, maxScroll));
      }
    } else if (targetSlot) {
      const markViewportArrived = beginSlotHighlight(targetSlot.key, MAX_HIGHLIGHT_DWELL_MS);
      markViewportArrived();
    }
  };

  const mastheadLines = useMemo(
    () =>
      getScheduleMastheadLines({
        events,
        termFinals,
        selectedGroup,
        nowMs,
        roll: mastheadRoll,
      }),
    [events, termFinals, selectedGroup, nowMs, mastheadRoll]
  );

  return (
    <MotionConfig reducedMotion="user">
    <div
      className={`relative min-h-dvh w-full max-w-full overflow-x-hidden ${
        isDark ? 'bg-[#161514]' : 'bg-[#F4F3EF]'
      }`}
    >
      {/* Unified background dashboard layer: scales & rounds 1:1 with live sheetY motion value (zero CSS transition lag) */}
      <motion.div
        style={{
          scale: backgroundScale,
          borderRadius: backgroundRadius,
          transformOrigin: `50% ${canvasOriginYRef.current}px`,
          isolation: 'isolate',
        }}
        className={`relative min-h-dvh flex flex-col w-full max-w-full overflow-hidden font-sans will-change-transform transform-gpu ${
          isDark
            ? 'text-stone-100 selection:bg-stone-800 selection:text-stone-100'
            : 'text-stone-900 selection:bg-stone-200 selection:text-stone-900'
        }`}
      >
        <div
          className={`relative z-10 flex-1 flex flex-col pb-[env(safe-area-inset-bottom)] ${
            isDark ? 'bg-[#161514]' : 'bg-[#F4F3EF]'
          }`}
        >
        {/* Aviation Operations Header with MSE '24 Hidden Admin Door and Discreet Refresh */}
        <Header
          onManualSync={() => fetchAndSync()}
          syncStatus={syncStatus}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onTriggerAdminVerification={() => setIsPinDialogOpen(true)}
          mastheadLines={mastheadLines}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-0 pb-6 flex flex-col overflow-x-hidden">
        {/* 'UP NEXT' UPCOMING SESSIONS DEPARTURES WIDGET */}
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

        {/* UNIFIED SCHEDULE MATRIX / TERM FINALS FULL-WIDTH VIEW */}
        <div>
          <div className="flex flex-col mb-3 px-1">
            <motion.div
              initial={{ opacity: 0, y: 7 }}
              animate={{ opacity: 1, y: 0 }}
              transition={startupTextTransition(0.25)}
              className="flex items-center justify-between sm:justify-start w-full mb-0"
            >
              {hasUpcomingFinals ? (
                <div
                  className="flex items-center gap-3.5"
                  role="tablist"
                  aria-label="Schedule view switcher"
                >
                  <motion.button
                    type="button"
                    role="tab"
                    aria-selected={!isTermFinalView}
                    onClick={() => setViewOverride('weekly')}
                    initial={false}
                    animate={{ opacity: !isTermFinalView ? 1 : 0.4 }}
                    whileHover={{
                      opacity: !isTermFinalView ? 1 : 0.68,
                    }}
                    whileTap={{ scale: 0.985 }}
                    transition={MICRO_FADE_TRANSITION}
                    className={`mb-0 font-['Newsreader',Georgia,serif] text-[1.1875rem] font-semibold tracking-[-0.015em] leading-tight transition-colors duration-150 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-1 rounded-md ${
                      isDark
                        ? 'text-stone-100 hover:text-stone-300 focus-visible:ring-stone-100'
                        : 'text-stone-900 hover:text-black focus-visible:ring-stone-900'
                    }`}
                  >
                    Weekly Routine
                  </motion.button>
                  <motion.button
                    type="button"
                    role="tab"
                    aria-selected={isTermFinalView}
                    onClick={() => setViewOverride('termFinals')}
                    initial={false}
                    animate={{ opacity: isTermFinalView ? 1 : 0.4 }}
                    whileHover={{
                      opacity: isTermFinalView ? 1 : 0.68,
                    }}
                    whileTap={{ scale: 0.985 }}
                    transition={MICRO_FADE_TRANSITION}
                    className={`mb-0 font-['Newsreader',Georgia,serif] text-[1.1875rem] font-semibold tracking-[-0.015em] leading-tight transition-colors duration-150 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-1 rounded-md ${
                      isDark
                        ? 'text-stone-100 hover:text-stone-300 focus-visible:ring-stone-100'
                        : 'text-stone-900 hover:text-black focus-visible:ring-stone-900'
                    }`}
                  >
                    Term Finals
                  </motion.button>
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
            </motion.div>

            <AnimatePresence>
              {!isTermFinalView && (
                <motion.div
                  key="weekly-controls"
                  initial={hasCompletedInitialMount ? { height: 0, opacity: 0, y: -4 } : false}
                  animate={{ height: 'auto', opacity: 1, y: 0 }}
                  exit={{ height: 0, opacity: 0, y: -4 }}
                  transition={VIEW_TRANSITION}
                  className="overflow-hidden -mx-1 px-1"
                >
                  <div className="pb-0.5">
                {/* Plain borderless muted-gray status line with optically balanced spacing above and below */}
                <motion.div
                  initial={isColdScheduleStartup ? { opacity: 0, y: 5 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={startupTextTransition(0.28)}
                  className="mt-1.5 mb-3 flex flex-col gap-0.5 min-w-0"
                >
                  {!outOfOrdinaryNotice ? (
                    <p
                      className={`text-sm leading-5 font-sans font-normal select-none ${
                        isDark ? 'text-neutral-400' : 'text-neutral-500'
                      }`}
                    >
                      Nothing out of the ordinary
                    </p>
                  ) : (
                    <motion.button
                      type="button"
                      whileHover={{ x: 2.5 }}
                      whileTap={{ scale: 0.98 }}
                      transition={CARD_INTERACTION_SPRING}
                      onClick={() => handleScrollToOffRoutineSlot(outOfOrdinaryNotice.primaryTarget)}
                      title={`Jump to ${outOfOrdinaryNotice.label}`}
                      className={`p-0 m-0 border-0 bg-transparent text-left text-sm leading-5 font-sans font-normal tabular-nums cursor-pointer select-none transition-colors duration-150 self-start max-w-full ${
                        isDark
                          ? 'text-neutral-400 hover:text-neutral-200'
                          : 'text-neutral-500 hover:text-neutral-800'
                      }`}
                    >
                      {outOfOrdinaryNotice.label}
                    </motion.button>
                  )}
                </motion.div>

                {/* Group Selector & Jump to Now Controls (Harmonized h-9 row) */}
                <div className="flex items-center gap-2 flex-nowrap self-start">
                {/* One UI-style segmented pill selector with spring-animated sliding indicator (h-9) */}
                <motion.div
                  initial={isColdScheduleStartup ? { opacity: 0, scale: 0.95, y: 5 } : false}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={startupPopTransition(0.3)}
                  className={`h-9 inline-flex items-center p-1 rounded-full overflow-hidden border border-transparent transition-colors box-border shrink-0 ${
                    isDark
                      ? 'bg-[#100F0E] shadow-[inset_0_4px_22px_rgba(0,0,0,0.13),inset_0_1px_8px_rgba(0,0,0,0.08),inset_0_-1px_0_rgba(255,255,255,0.018)]'
                      : 'bg-[#EAE8E2] shadow-[inset_0_3px_18px_rgba(24,23,22,0.028),inset_0_1px_6px_rgba(24,23,22,0.015)]'
                  }`}
                  role="tablist"
                  aria-label="Filter schedule by Section or Lab Group"
                >
                  <div
                    ref={groupTrackRef}
                    onPointerLeave={() => setHoveredGroup(null)}
                    className="relative h-full inline-flex items-center rounded-full overflow-hidden"
                  >
                    {/* Sliding Active Indicator Pill (concentric & clipped inside uniform p-1 outer track) */}
                    <motion.div
                      aria-hidden="true"
                      style={{
                        x: clampedGroupPillX,
                        width: clampedGroupPillWidth,
                        opacity: isGroupPillReady ? 1 : 0,
                      }}
                      className={`absolute inset-y-0 left-0 rounded-full pointer-events-none will-change-transform transform-gpu ${
                        isDark ? 'bg-stone-100' : 'bg-stone-900'
                      }`}
                    />
                    {(['All', 'Group A', 'Group B'] as const).map((groupOption, groupIdx) => {
                      const isSelected = selectedGroup === groupOption;
                      return (
                        <motion.button
                          key={groupOption}
                          ref={(el) => {
                            groupTabRefs.current[groupOption] = el;
                          }}
                          type="button"
                          role="tab"
                          aria-selected={isSelected}
                          onClick={() => handleSelectGroup(groupOption)}
                          onPointerEnter={(e) => {
                            if (e.pointerType !== 'touch') {
                              setHoveredGroup(groupOption);
                            }
                          }}
                          onPointerDown={() => {
                            if (!isSelected) {
                              setPressedGroup(groupOption);
                            }
                          }}
                          onPointerLeave={() => {
                            if (pressedGroup === groupOption) {
                              setPressedGroup(null);
                            }
                          }}
                          onPointerCancel={() => {
                            if (pressedGroup === groupOption) {
                              setPressedGroup(null);
                            }
                          }}
                          whileTap={{ scale: 0.96 }}
                          transition={TACTILE_SPRING}
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
                          <motion.span
                            initial={isColdScheduleStartup ? { opacity: 0, y: 3 } : false}
                            animate={{ opacity: 1, y: 0 }}
                            transition={startupTextTransition(0.32 + groupIdx * 0.02, 0.2)}
                            className="inline-block"
                          >
                            {groupOption}
                          </motion.span>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>

                {/* Compact Tactile Micro-Pill "Now" / "Next" Jump Button (Harmonized h-9) */}
                <motion.div
                  initial={isColdScheduleStartup ? { opacity: 0, scale: 0.92, y: 5 } : false}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={startupPopTransition(0.34)}
                  className="shrink-0"
                >
                <motion.button
                  type="button"
                  onClick={() => {
                    setJumpIconAnimId((id) => id + 1);
                    handleScrollToNow();
                  }}
                  onHoverStart={() => setJumpIconAnimId((id) => id + 1)}
                  whileHover={{ y: -1.5, scale: 1.03 }}
                  whileTap={{ scale: 0.93 }}
                  transition={TACTILE_SPRING}
                  title={
                    hasActiveOrRemainingSlotToday
                      ? 'Jump view to current operating hour'
                      : 'Jump view to next scheduled class'
                  }
                  className={`h-9 px-3.5 py-0 text-xs font-semibold leading-none rounded-full inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors duration-150 border select-none shrink-0 whitespace-nowrap ${
                    isDark
                      ? 'bg-[#1E1D1C] hover:bg-[#262523] text-stone-100 border-transparent'
                      : 'bg-white hover:bg-stone-50 text-stone-900 border-transparent shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]'
                  }`}
                >
                  {hasActiveOrRemainingSlotToday ? (
                    <>
                      <motion.span
                        key={`jump-clock-${jumpIconAnimId}`}
                        initial={{ rotate: 0 }}
                        animate={jumpIconAnimId > 0 ? { rotate: [0, -18, 14, -6, 0] } : { rotate: 0 }}
                        transition={{ duration: 0.44, ease: EASE_OUT_EXPO }}
                        className="inline-flex items-center justify-center shrink-0"
                      >
                        <Clock className="w-3.5 h-3.5 shrink-0 text-[#9E2C2C]" />
                      </motion.span>
                      <span className="leading-none">Now</span>
                    </>
                  ) : (
                    <>
                      <motion.span
                        key={`jump-arrow-${jumpIconAnimId}`}
                        initial={{ x: 0 }}
                        animate={jumpIconAnimId > 0 ? { x: [0, 3.5, 0] } : { x: 0 }}
                        transition={{ duration: 0.38, ease: EASE_OUT_EXPO }}
                        className="inline-flex items-center justify-center shrink-0"
                      >
                        <ArrowRight className="w-3.5 h-3.5 shrink-0 text-[#9E2C2C]" />
                      </motion.span>
                      <span className="leading-none">Next</span>
                    </>
                  )}
                </motion.button>
                </motion.div>
              </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            {isTermFinalView ? (
              <motion.div
                key="term-finals-view"
                initial={hasCompletedInitialMount ? { opacity: 0, y: 10 } : false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={VIEW_TRANSITION}
              >
                <TermFinalsList
                  termFinals={termFinals}
                  nowMs={nowMs}
                  theme={theme}
                  onSelectExam={(exam) => setSelectedEvent(termFinalToRoutineEvent(exam))}
                  isInitialStartup={isColdScheduleStartup}
                />
              </motion.div>
            ) : (
              <motion.div
                key="weekly-routine-view"
                initial={hasCompletedInitialMount ? { opacity: 0, y: 10 } : false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={VIEW_TRANSITION}
              >
                <MasterTimelineGrid
                  days={operationalDays}
                  events={events}
                  todayName={todayName}
                  currentMinuteOffset={currentMinuteOffset}
                  onSelectEvent={(evt) => setSelectedEvent(evt)}
                  scrollRef={scrollContainerRef}
                  theme={theme}
                  selectedGroup={selectedGroup}
                  highlightedEventKey={highlightedSlot?.key ?? null}
                  highlightPhase={highlightedSlot?.phase ?? null}
                  highlightSeq={highlightedSlot?.seq ?? 0}
                  totalDayMinutes={dynamicTotalDayMinutes}
                  isInitialStartup={isColdScheduleStartup}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
        </div>
      </motion.div>

      {/* Scroll-linked top edge theme-colored gradient scrim (strictly below z-40 modal backdrop) */}
      <motion.div
        aria-hidden="true"
        style={{ opacity: topScrimOpacity }}
        className="top-edge-scrim fixed top-0 left-0 right-0 pointer-events-none z-30"
      />

      {/* Full-viewport gesture-linked dimmed + blurred modal backdrop (tracks sheetY 1:1 with zero CSS transition lag) */}
      <motion.div
        aria-hidden="true"
        style={{
          opacity: backdropOpacity,
          backdropFilter: backdropBlur,
          WebkitBackdropFilter: backdropBlur,
          visibility: backdropVisibility,
          pointerEvents: isAnyModalOpen ? 'auto' : 'none',
        }}
        onClick={(e) => {
          e.stopPropagation();
          closeAllModals();
        }}
        className="fixed inset-0 z-40 bg-black/45 will-change-[opacity,backdrop-filter]"
      />

      {/* Bottom Sheet Modals sharing single sheetY MotionValue source of truth */}
      <BottomSheetMotionContext.Provider value={sheetMotionContextValue}>
        <AnimatePresence mode="wait">
          {selectedEvent ? (
            <EventModal
              key={`event-modal-${selectedEvent.id || `${selectedEvent.day}-${selectedEvent.startTime}-${selectedEvent.subject}`}`}
              event={selectedEvent}
              onClose={() => setSelectedEvent(null)}
              theme={theme}
            />
          ) : isAssignmentsModalOpen ? (
            <AssignmentsModal
              key="assignments-modal"
              assignments={assignments}
              onClose={() => setIsAssignmentsModalOpen(false)}
              theme={theme}
            />
          ) : isAdminModalOpen ? (
            <AdminConfigModal
              key="admin-config-modal"
              onClose={() => setIsAdminModalOpen(false)}
              currentUrl={activeCsvUrl}
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
          ) : null}
        </AnimatePresence>
      </BottomSheetMotionContext.Provider>

      {/* Admin PIN Verification Dialog (PIN: 2024 via Triple-Tap) */}
      <AdminPinDialog
        isOpen={isPinDialogOpen}
        onClose={() => setIsPinDialogOpen(false)}
        onSuccess={() => setIsAdminModalOpen(true)}
        theme={theme}
      />

      {/* Standalone HTML Exporter (accessible via Admin Config) */}
      <StandaloneHtmlExporter
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        theme={theme}
      />
    </div>
    </MotionConfig>
  );
}
