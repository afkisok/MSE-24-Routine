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
  isMounted?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onManualSync,
  syncStatus,
  theme,
  onToggleTheme,
  onTriggerAdminVerification,
  isMounted = true,
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
      className={`select-none w-full transition-[opacity,transform] duration-300 ease-out delay-0 ${
        isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 pb-2 flex flex-col">
        {/* Top Row: Three Equal-Sized Circles (MSE '24 left, Refresh + Theme right) */}
        <div className="flex items-center justify-between gap-3">
          {/* MSE '24 Brand Mark Badge (Strict Triple-Tap Protected) */}
          <button
            type="button"
            onClick={handleClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            aria-label="MSE '24 Department Routine Badge"
            style={{ touchAction: 'manipulation' }}
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border cursor-pointer select-none touch-manipulation transition-transform duration-300 ease-out active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 ${
              isMounted ? 'scale-100' : 'scale-95'
            } ${
              isDark
                ? 'bg-stone-100 text-stone-900 border-stone-100 hover:bg-stone-200'
                : 'bg-stone-900 text-stone-50 border-stone-900 hover:bg-stone-800'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="120 95 348 395"
              fill="currentColor"
              className="w-5 h-5"
              aria-hidden="true"
            >
              <path d="M416.47,447.53h-52.76s-.04,28.55-.04,28.55h-93.55s.06-11.47.06-11.47c.08-16.73,7.53-31.72,17.57-44.75l20.86-27.08c11.2-14.53,18.4-29.96,18.15-48.62-.11-8.21-1.64-15.21-9.33-15.43-2.94-.08-5.34,1.2-7.16,3.84-1.08,2.78-2.15,5.99-2.16,9.17l-.06,25.14h-37.85c-1.19-15.79-.52-32.7,4.95-47.86,4.16-10.88,12.59-18.79,23.98-21.83,11.37-3.03,23.44-3.17,34.85-.2,11.25,2.93,20.13,10.09,25.42,20.26,3.79,7.28,5.02,14.88,5.44,23.07,1.09,20.99-5.35,40.83-18.22,57.3l-20,25.58c-4.66,5.96-8.78,11.93-12.05,18.8h48.4s.15-23.02.15-23.02l34.03-123.48,56.14.02v121.86s9.68.06,9.68.06l.03,30.04-9.71.14-.02,28.56h-36.79s0-28.63,0-28.63ZM416.49,417.45l-.14-89.74-21.14,89.63,21.29.11Z" />
              <g>
                <g>
                  <path d="M310.89,286.01c-10.49-3.06-17.95-10-21.81-19.95-2.69-6.94-4.35-14.19-4.41-21.8l-.18-24.59h35.65s0,23.7,0,23.7c0,3.02.72,5.96,1.71,8.68,1.58,2.5,4.01,3.43,6.86,3.53,4.27.16,7.68-2.49,8.21-6.87,1.39-11.5-.44-23.87-8.77-32.23l-14.36-14.4-15.08-14.64c-10.67-11.2-15.52-25.92-14.08-41.26.67-7.12,1.8-13.77,4.8-20.29,4.37-9.48,12.21-16.26,22.48-18.97,11.39-3.01,23.58-2.51,34.75,1.2,8.33,2.77,14.58,8.51,18.53,16.15,2.83,5.94,4.65,11.98,5.55,18.53l1.12,15.7h-36.76s-.04-12.63-.04-12.63c-.01-4.49-3.22-7.89-7.87-7.57-4.8-.35-8.24,3.22-8.18,8.19.07,5.55,2.37,11.03,6.55,15.08l19.93,19.32,13.93,14.43c7.01,8.26,11.66,17.95,12.94,28.85s.7,21.69-1.59,32.43c-1.18,5.53-3.09,10.49-5.78,15.44-4.12,7.59-11.11,12.92-19.66,14.99-11.33,2.74-23.07,2.29-34.46-1.03Z" />
                  <polygon points="449.56 210.63 415.53 210.64 415.5 251.88 453.29 251.96 453.28 287.16 378.76 287.08 378.76 106.71 450.98 106.68 450.98 141.58 415.49 141.6 415.54 176.66 449.54 176.67 449.56 210.63" />
                </g>
                <g>
                  <polygon points="245.5 287.16 245.43 157.88 224.79 287.13 192.4 287.16 170.63 158.82 170.5 287.17 137.9 287.14 137.89 106.72 192.79 106.67 207.98 216.06 223.02 106.69 278.46 106.7 278.46 287.15 245.5 287.16" />
                  <polygon points="173.67 319.82 173.74 350.43 135.45 350.43 135.45 320.68 145.92 295.61 167.49 295.6 160.76 319.79 173.67 319.82" />
                </g>
              </g>
            </svg>
          </button>

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
              className={`w-[38px] h-[38px] rounded-full flex items-center justify-center cursor-pointer transition-all duration-150 active:scale-95 border select-none disabled:opacity-60 ${
                isDark
                  ? 'bg-[#1C1A18] border-stone-800 text-stone-300 hover:text-stone-100 hover:bg-[#24211E]'
                  : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-50 hover:border-stone-400 hover:text-stone-900'
              }`}
            >
              <RefreshCw
                className={`w-4 h-4 transition-transform duration-200 ${
                  syncStatus.status === 'syncing' ? 'animate-spin text-amber-500' : ''
                }`}
              />
            </button>

            {/* Clean Circular Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              type="button"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className={`w-[38px] h-[38px] rounded-full flex items-center justify-center cursor-pointer transition-all duration-150 active:scale-95 border select-none ${
                isDark
                  ? 'bg-[#1C1A18] border-stone-800 text-amber-300 hover:bg-[#24211E] hover:text-amber-200'
                  : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-50 hover:border-stone-400 hover:text-stone-900'
              }`}
            >
              {isDark ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Standalone Bold Heading directly below MSE '24 */}
        <h1
          className={`mt-3 text-[32px] font-bold tracking-tight leading-tight ${
            isDark ? 'text-stone-100' : 'text-stone-900'
          }`}
        >
          2-2 Routine
        </h1>
      </div>
    </header>
  );
};
