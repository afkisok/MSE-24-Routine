import React, { useState, useEffect, useRef } from 'react';
import { RoutineEvent, DEFAULT_ROUTINE_CSV_URL } from './types/routine';
import { baselineTestData } from './data/baselineData';
import { DAY_START_MINUTES, DAY_END_MINUTES, TOTAL_DAY_MINUTES } from './utils/timeCalculations';
import { parseCSV, csvRowsToEvents } from './utils/csvParser';
import {
  processDifferentialLogs,
  clearDispatchLogs,
  getCachedDispatchLogs,
  DispatchLogItem,
} from './utils/deltaLogEngine';
import { getCalendarWeekInfo } from './utils/alternatingLabEngine';
import { Header } from './components/Header';
import { AtAGlanceWidget } from './components/AtAGlanceWidget';
import { DispatchLogSection } from './components/DispatchLogSection';
import { MasterTimelineGrid } from './components/MasterTimelineGrid';
import { EventModal } from './components/EventModal';
import { AdminConfigModal } from './components/AdminConfigModal';
import { AdminPinDialog } from './components/AdminPinDialog';
import { StandaloneHtmlExporter } from './components/StandaloneHtmlExporter';
import { Clock } from 'lucide-react';

const CACHED_EVENTS_KEY = 'mse24_cached_routine_events';
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

  const [selectedEvent, setSelectedEvent] = useState<RoutineEvent | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [dispatchLogs, setDispatchLogs] = useState<DispatchLogItem[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    try {
      return localStorage.getItem(CACHED_SYNC_TIME_KEY) || null;
    } catch {
      return null;
    }
  });

  const weekInfo = getCalendarWeekInfo();

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

  // 1. Initial differential log check on load
  useEffect(() => {
    const existing = getCachedDispatchLogs();
    if (existing.length > 0) {
      setDispatchLogs(existing);
    } else {
      const { logs } = processDifferentialLogs(events);
      setDispatchLogs(logs);
    }
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
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP_${res.status}`);
      const csvText = await res.text();
      const rawRows = parseCSV(csvText);
      const parsed = csvRowsToEvents(rawRows);
      if (parsed.length === 0) {
        throw new Error('NO_VALID_DATA_ROWS');
      }

      setEvents(parsed);

      try {
        localStorage.setItem(CACHED_EVENTS_KEY, JSON.stringify(parsed));
        const nowISO = new Date().toISOString();
        localStorage.setItem(CACHED_SYNC_TIME_KEY, nowISO);
        setLastSyncTime(nowISO);
      } catch (e) {
        console.warn('Failed to cache events to localStorage:', e);
      }

      // Run differential changelog engine: diff against snapshot
      const { newLogsCount, logs } = processDifferentialLogs(parsed);
      setDispatchLogs(logs);

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
    } catch (e) {
      console.warn('Failed to clear cached events:', e);
    }
    setEvents(baselineTestData);
    const { logs } = processDifferentialLogs(baselineTestData);
    setDispatchLogs(logs);
    setSyncStatus({ status: 'idle', message: 'BASELINE_DEFAULT_RESTORED' });
  };

  const handleClearLogs = () => {
    const updated = clearDispatchLogs();
    setDispatchLogs(updated);
  };

  // Realtime digital clock update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
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
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      if (currentMinuteOffset !== null) {
        const ratio = currentMinuteOffset / TOTAL_DAY_MINUTES;
        const targetScroll = (container.scrollWidth - container.clientWidth) * ratio;
        container.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
      } else {
        container.scrollTo({ left: 240, behavior: 'smooth' });
      }
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col w-full max-w-full overflow-x-hidden font-sans transition-colors ${
        isDark
          ? 'bg-[#0F172A] text-white selection:bg-slate-700 selection:text-white'
          : 'bg-white text-[#0F172A] selection:bg-slate-200 selection:text-slate-900'
      }`}
    >
      {/* Aviation Operations Header with B24 Hidden Admin Door and Discreet Refresh */}
      <Header
        onManualSync={() => fetchAndSync()}
        syncStatus={syncStatus}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onTriggerAdminVerification={() => setIsPinDialogOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-5 flex flex-col overflow-x-hidden">
        {/* 'UP NEXT' UPCOMING SESSIONS DEPARTURES WIDGET */}
        <AtAGlanceWidget
          events={events}
          onSelectEvent={(evt) => setSelectedEvent(evt)}
          theme={theme}
          selectedGroup={selectedGroup}
        />

        {/* OPERATIONAL DISPATCH LOG SECTION (Differential Engine) */}
        <DispatchLogSection
          logs={dispatchLogs}
          onClearLogs={handleClearLogs}
          theme={theme}
        />

        {/* UNIFIED SCHEDULE MATRIX */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 px-1">
            <div className="flex items-center gap-2">
              <h2
                className={`font-bold text-sm tracking-tight ${
                  isDark ? 'text-white' : 'text-[#0F172A]'
                }`}
              >
                Weekly Routine
              </h2>
            </div>

            {/* Group Selector & Jump to Now Controls (Harmonized h-9 row) */}
            <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
              {/* One UI-style segmented pill selector for Section / Group (h-9) */}
              <div
                className={`h-9 inline-flex items-center p-1 rounded-full border transition-colors box-border ${
                  isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-slate-100 border-slate-200'
                }`}
                role="tablist"
                aria-label="Filter schedule by Section or Lab Group"
              >
                {(['All', 'Group A', 'Group B'] as const).map((groupOption) => {
                  const isSelected = selectedGroup === groupOption;
                  return (
                    <button
                      key={groupOption}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => setSelectedGroup(groupOption)}
                      className={`h-full px-3.5 text-xs font-semibold rounded-full transition-all cursor-pointer select-none flex items-center justify-center ${
                        isSelected
                          ? isDark
                            ? 'bg-white text-[#0F172A] shadow-xs'
                            : 'bg-[#0F172A] text-white shadow-xs'
                          : isDark
                          ? 'text-zinc-400 hover:text-white'
                          : 'text-slate-600 hover:text-slate-900'
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
                className={`h-9 px-3.5 text-xs font-semibold rounded-full flex items-center gap-1.5 cursor-pointer transition-all duration-150 active:scale-95 border select-none ${
                  isDark
                    ? 'bg-[#18181B] hover:bg-[#27272A] text-[#FAFAFA] border-[#27272A] shadow-2xs'
                    : 'bg-white hover:bg-slate-50 text-[#09090B] border-slate-200 shadow-2xs'
                }`}
              >
                <Clock className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <span>Now</span>
              </button>
            </div>
          </div>

          <MasterTimelineGrid
            days={OPERATIONAL_DAYS}
            events={events}
            todayName={todayName}
            currentMinuteOffset={currentMinuteOffset}
            onSelectEvent={(evt) => setSelectedEvent(evt)}
            scrollRef={scrollContainerRef}
            theme={theme}
            selectedGroup={selectedGroup}
          />
        </div>

        {/* Clean Production Footer */}
        <footer
          className={`mt-8 pt-4 pb-6 border-t flex items-center justify-center text-xs font-sans transition-colors ${
            isDark
              ? 'border-[#334155] text-slate-400'
              : 'border-[#E2E8F0] text-slate-500'
          }`}
        >
          <span className="font-medium text-center">
            MSE 2K24 / Batch Routine
          </span>
        </footer>
      </main>

      {/* Flight Manifest Modal Inspector */}
      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
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
      <AdminConfigModal
        isOpen={isAdminModalOpen}
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

      {/* Standalone HTML Exporter (accessible via Admin Config) */}
      <StandaloneHtmlExporter
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        theme={theme}
      />
    </div>
  );
}
