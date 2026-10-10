import React, { useRef } from 'react';
import { RefreshCw, Sun, Moon } from 'lucide-react';

interface SyncStatus {
  status: 'idle' | 'syncing' | 'success' | 'error';
  message: string;
}

interface HeaderProps {
  onManualSync: () => void;
  syncStatus: SyncStatus;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onTriggerAdminVerification: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onManualSync,
  syncStatus,
  theme,
  onToggleTheme,
  onTriggerAdminVerification,
}) => {
  const isDark = theme === 'dark';

  // Timing and tap counter state for mobile touchscreens (850ms window)
  const tapCountRef = useRef(0);
  const lastTapTimeRef = useRef(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const triggerHaptic = () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(50);
      }
    } catch {
      // Ignore vibration error if unsupported or disallowed
    }
  };

  const handleTap = (e?: React.SyntheticEvent) => {
    if (e && 'preventDefault' in e && e.type.startsWith('touch')) {
      e.preventDefault();
    }

    const now = Date.now();
    const timeSinceLastTap = now - lastTapTimeRef.current;
    lastTapTimeRef.current = now;

    // Clear any pending timeout reset
    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
    }

    if (timeSinceLastTap < 850) {
      tapCountRef.current += 1;
    } else {
      tapCountRef.current = 1;
    }

    // Provide subtle haptic feedback on physical mobile devices
    triggerHaptic();

    if (tapCountRef.current === 3) {
      tapCountRef.current = 0;
      lastTapTimeRef.current = 0;
      onTriggerAdminVerification();
    } else {
      // Reset count to 0 if next tap does not arrive within 850ms
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
        lastTapTimeRef.current = 0;
      }, 850);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return;
    const touch = e.changedTouches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    touchStartPosRef.current = null;

    // Reject scrolling, panning, or drag gestures (threshold: 10px)
    if (dx > 10 || dy > 10) return;

    handleTap(e);
  };

  const handleClick = (e: React.MouseEvent) => {
    // Prevent synthetic click from firing immediately after touchEnd (within 400ms)
    if (Date.now() - lastTapTimeRef.current < 400 && lastTapTimeRef.current > 0) {
      return;
    }
    handleTap(e);
  };

  return (
    <header
      className={`sticky top-0 z-40 select-none w-full transition-colors ${
        isDark
          ? 'bg-[#0F172A] border-b border-[#334155] shadow-[0_1px_0_0_#334155]'
          : 'bg-white border-b border-[#E2E8F0] shadow-xs'
      }`}
    >
      {/* Primary Departmental Header */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-3">
        {/* Wordmark with B24 Insignia (Strict Triple-Tap Protected) */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            aria-label="Department Routine Badge"
            style={{ touchAction: 'manipulation' }}
            className={`w-9 h-9 rounded-2xl font-sans font-semibold text-xs flex items-center justify-center shrink-0 border tracking-normal cursor-pointer select-none touch-manipulation transition-transform duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              isDark
                ? 'bg-white text-[#0F172A] border-white hover:bg-slate-100'
                : 'bg-[#0F172A] text-white border-[#0F172A] hover:bg-slate-800'
            }`}
          >
            B24
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1
                className={`text-base sm:text-lg font-semibold tracking-normal leading-tight truncate ${
                  isDark ? 'text-white' : 'text-[#0F172A]'
                }`}
              >
                MSE 2K24 / Batch Routine
              </h1>
            </div>
            <p
              className={`text-[11px] truncate font-normal ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Dept. of Materials Science and Engineering, KUET
            </p>
          </div>
        </div>

        {/* Header Right Actions: Discreet Manual Refresh + Clean Circular Theme Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Discreet Manual Refresh Button */}
          <button
            onClick={onManualSync}
            disabled={syncStatus.status === 'syncing'}
            type="button"
            title={
              syncStatus.status === 'syncing'
                ? 'Syncing latest routine data...'
                : 'Refresh routine schedule'
            }
            aria-label="Refresh routine schedule"
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center cursor-pointer transition-all duration-150 active:scale-95 border select-none disabled:opacity-60 ${
              isDark
                ? 'bg-[#18181B] border-[#27272A] text-slate-300 hover:text-white hover:bg-[#27272A]'
                : 'bg-white border-[#CBD5E1] text-slate-700 hover:bg-slate-50 hover:border-slate-400 hover:text-slate-900'
            }`}
          >
            <RefreshCw
              className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform ${
                syncStatus.status === 'syncing' ? 'animate-spin text-blue-500' : ''
              }`}
            />
          </button>

          {/* Clean Circular Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            type="button"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center cursor-pointer transition-all duration-150 active:scale-95 border select-none ${
              isDark
                ? 'bg-[#18181B] border-[#27272A] text-amber-300 hover:bg-[#27272A] hover:text-amber-200'
                : 'bg-white border-[#CBD5E1] text-slate-700 hover:bg-slate-50 hover:border-slate-400 hover:text-slate-900'
            }`}
          >
            {isDark ? (
              <Sun className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            ) : (
              <Moon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
