import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { RoutineEvent, RoutineAssignment, TermFinalExam, DEFAULT_ROUTINE_CSV_URL } from './types/routine';
import { baselineTestData } from './data/baselineData';
import {
  DAY_START_MINUTES,
  DAY_END_MINUTES,
  TOTAL_DAY_MINUTES,
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
import { Header } from './components/Header';
import { AtAGlanceWidget } from './components/AtAGlanceWidget';
import { MasterTimelineGrid } from './components/MasterTimelineGrid';
import { TermFinalsList } from './components/TermFinalsList';
import { EventModal } from './components/EventModal';
import { AssignmentsModal } from './components/AssignmentsModal';
import { AdminConfigModal } from './components/AdminConfigModal';
import { AdminPinDialog } from './components/AdminPinDialog';
import { StandaloneHtmlExporter } from './components/StandaloneHtmlExporter';
import { Clock } from 'lucide-react';

const CACHED_EVENTS_KEY = 'mse24_cached_routine_events';
const CACHED_ASSIGNMENTS_KEY = 'mse24_cached_routine_assignments';
const CACHED_TERM_FINALS_KEY = 'mse24_cached_routine_term_finals';
const CACHED_SYNC_TIME_KEY = 'mse24_cached_sync_time';
const ADMIN_CSV_URL_KEY = 'admin_routine_csv_url';

const OPERATIONAL_DAYS: Array<'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday'> = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
];

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

  useEffect(() => {
    try {
      localStorage.setItem('aviation_theme', theme);
    } catch (e) {
      console.warn('localStorage write error:', e);
    }
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const targetColor =
      theme === 'dark' ? '#0D0D0D' : isAnyModalOpen ? '#969593' : '#FAF9F6';

    const existingMetas = Array.from(
      document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    );
    const dynamicMeta = existingMetas.find((el) => !el.hasAttribute('media'));

    existingMetas.forEach((el) => {
      if (el !== dynamicMeta) {
        el.remove();
      }
    });

    if (dynamicMeta) {
      if (dynamicMeta.content !== targetColor) {
        dynamicMeta.content = targetColor;
      }
    } else {
      const freshMeta = document.createElement('meta');
      freshMeta.name = 'theme-color';
      freshMeta.content = targetColor;
      document.head.appendChild(freshMeta);
    }
  }, [theme, isAnyModalOpen]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const isDark = theme === 'dark';

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

  // Sync state tracking
  const [syncStatus, setSyncStatus] = useState<{
    status: 'idle' | 'syncing' | 'success' | 'error';
    message: string;
  }>({
    status: 'idle',
    message: 'STANDBY // READY',
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
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
      const activeEl = groupTabRefs.current[selectedGroup];
      if (!activeEl) return;
      setPillStyle({
        left: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
        ready: true,
      });
    };

    updatePill();
    window.addEventListener('resize', updatePill);
    return () => window.removeEventListener('resize', updatePill);
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

  /**
   * Clean Single-Table Sync & Differential Engine
   */
  const fetchAndSync = async (targetUrl?: string, isSilent = false) => {
    const url = (targetUrl !== undefined ? targetUrl : getActiveCsvUrl()).trim();
    if (!url) {
      if (!isSilent) setSyncStatus({ status: 'error', message: 'ERROR: EMPTY_ENDPOINT_URL' });
      return;
    }

    setSyncStatus({ status: 'syncing', message: 'FETCHING_STREAM...' });
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

      try {
        if (parsed.length > 0) {
          localStorage.setItem(CACHED_EVENTS_KEY, JSON.stringify(parsed));
        }
        localStorage.setItem(CACHED_ASSIGNMENTS_KEY, JSON.stringify(parsedAssignments));
        localStorage.setItem(CACHED_TERM_FINALS_KEY, JSON.stringify(parsedTermFinals));
        const nowISO = new Date().toISOString();
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
      setSyncStatus({
        status: 'error',
        message: `FAILED: ${err?.message || 'NETWORK_OR_CORS_ERROR'}`,
      });
    }
  };

  // Silent sync in the background on mount
  useEffect(() => {
    const activeUrl = getActiveCsvUrl();
    fetchAndSync(activeUrl, true);
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

  // Realtime digital clock update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setNowMs(now.getTime());
      const day = now.toLocaleDateString('en-US', { weekday: 'long' });
      setTodayName(day);

      const totalMinutes = now.getHours() * 60 + now.getMinutes();
      if (totalMinutes >= DAY_START_MINUTES && totalMinutes <= DAY_END_MINUTES) {
        setCurrentMinuteOffset(totalMinutes - DAY_START_MINUTES);
      } else {
        setCurrentMinuteOffset(null);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

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
    const todayOperational = OPERATIONAL_DAYS.find(
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
        const opDay = OPERATIONAL_DAYS.find((d) => d.toLowerCase() === checkDay.toLowerCase());
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
      if (currentMinuteOffset !== null) {
        const focusX = (currentMinuteOffset / TOTAL_DAY_MINUTES) * container.scrollWidth;
        const targetScroll = Math.max(0, Math.min(maxScroll, focusX - container.clientWidth / 2));
        container.scrollTo({ left: targetScroll, behavior: 'smooth' });
      } else if (targetSlot) {
        const slotStartOffset = Math.max(
          0,
          Math.min(TOTAL_DAY_MINUTES, timeToMinutes(targetSlot.evt.startTime) - DAY_START_MINUTES)
        );
        const focusX = (slotStartOffset / TOTAL_DAY_MINUTES) * container.scrollWidth;
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

  return (
    <div
      className={`min-h-screen flex flex-col w-full max-w-full overflow-x-hidden font-sans transition-colors ${
        isDark
          ? 'bg-[#141312] text-stone-100 selection:bg-stone-800 selection:text-stone-100'
          : 'bg-[#FAF9F6] text-stone-900 selection:bg-stone-200 selection:text-stone-900'
      }`}
    >
      {/* Aviation Operations Header with MSE '24 Hidden Admin Door and Discreet Refresh */}
      <Header
        onManualSync={() => fetchAndSync()}
        syncStatus={syncStatus}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onTriggerAdminVerification={() => setIsPinDialogOpen(true)}
        isMounted={isMounted}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 pt-4 sm:pt-5 pb-7 flex flex-col overflow-x-hidden">
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
            isTermFinalMode={isTermFinalView}
            termFinals={termFinals}
            nowMs={nowMs}
            onSelectTermFinal={(exam) => setSelectedEvent(termFinalToRoutineEvent(exam))}
          />
        </div>

        {/* UNIFIED SCHEDULE MATRIX / TERM FINALS FULL-WIDTH VIEW */}
        <div>
          <div
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 px-1 transition-[opacity,transform] duration-300 ease-out delay-[100ms] ${
              isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto">
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
                    className={`text-[17px] font-bold tracking-tight leading-snug cursor-pointer select-none transition-opacity duration-150 ${
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
                    className={`text-[17px] font-bold tracking-tight leading-snug cursor-pointer select-none transition-opacity duration-150 ${
                      isDark ? 'text-stone-100' : 'text-stone-900'
                    } ${isTermFinalView ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
                  >
                    Term Finals
                  </button>
                </div>
              ) : (
                <h2
                  className={`text-[17px] font-bold tracking-tight leading-snug ${
                    isDark ? 'text-stone-100' : 'text-stone-900'
                  }`}
                >
                  Weekly Routine
                </h2>
              )}
            </div>

            {!isTermFinalView && (
              /* Group Selector & Jump to Now Controls (Harmonized h-9 row) */
              <div className="flex items-center gap-2 flex-nowrap self-start sm:self-auto">
                {/* One UI-style segmented pill selector with sliding indicator (h-9) */}
                <div
                  className={`relative h-9 inline-flex items-center p-1 rounded-full border transition-colors box-border shrink-0 ${
                    isDark ? 'bg-[#24211E] border-stone-800' : 'bg-stone-100 border-stone-200'
                  }`}
                  role="tablist"
                  aria-label="Filter schedule by Section or Lab Group"
                >
                  {/* Sliding Active Indicator Pill */}
                  <div
                    aria-hidden="true"
                    style={{
                      transform: `translateX(${pillStyle.left}px)`,
                      width: `${pillStyle.width}px`,
                      opacity: pillStyle.ready ? 1 : 0,
                    }}
                    className={`absolute top-1 bottom-1 left-0 rounded-full pointer-events-none ${
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
                        onClick={() => setSelectedGroup(groupOption)}
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

                {/* Compact Tactile Micro-Pill "Jump to Now" Button (Harmonized h-9) */}
                <button
                  type="button"
                  onClick={handleScrollToNow}
                  title="Jump view to current operating hour"
                  className={`h-9 px-3.5 text-xs font-semibold rounded-full flex items-center gap-1.5 cursor-pointer transition-all duration-150 active:scale-95 border select-none shrink-0 whitespace-nowrap ${
                    isDark
                      ? 'bg-[#1C1A18] hover:bg-[#24211E] text-stone-100 border-stone-800 shadow-2xs'
                      : 'bg-white hover:bg-stone-50 text-stone-900 border-stone-300 shadow-2xs'
                  }`}
                >
                  <Clock className={`w-3.5 h-3.5 ${isDark ? 'text-[#C84B4D]' : 'text-[#9E2A2B]'}`} />
                  <span>Now</span>
                </button>
              </div>
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
                days={OPERATIONAL_DAYS}
                events={events}
                todayName={todayName}
                currentMinuteOffset={currentMinuteOffset}
                onSelectEvent={(evt) => setSelectedEvent(evt)}
                scrollRef={scrollContainerRef}
                theme={theme}
                selectedGroup={selectedGroup}
                highlightedEventKey={highlightedEventKey}
              />
            )}
          </div>
        </div>
      </main>

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
