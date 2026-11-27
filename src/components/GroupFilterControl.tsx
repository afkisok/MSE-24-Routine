import React, { useLayoutEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';

export type GroupOption = 'All' | 'Group A' | 'Group B';

const GROUP_OPTIONS: readonly GroupOption[] = ['All', 'Group A', 'Group B'] as const;

/**
 * Critically damped spring (ζ ≈ 0.984) matched across the UI — snappy response, zero overshoot.
 * Dual-edge clamping below guarantees the pill never leaves or clips outside the track container.
 */
const PILL_SPRING = {
  stiffness: 380,
  damping: 36,
  mass: 0.88,
};

interface GroupFilterControlProps {
  selectedGroup: GroupOption;
  onSelectGroup: (group: GroupOption) => void;
  isDark: boolean;
}

export const GroupFilterControl: React.FC<GroupFilterControlProps> = ({
  selectedGroup,
  onSelectGroup,
  isDark,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<GroupOption, HTMLButtonElement | null>>({
    All: null,
    'Group A': null,
    'Group B': null,
  });

  const hasInitializedRef = useRef(false);
  const prevGroupRef = useRef<GroupOption>(selectedGroup);
  const [isReady, setIsReady] = useState(false);

  const trackWidthMV = useMotionValue(0);
  const rawLeft = useSpring(0, PILL_SPRING);
  const rawRight = useSpring(0, PILL_SPRING);

  // Clamp both pill edges strictly inside [0, trackWidth] so spring momentum subtly
  // compresses against the track bumper instead of overflowing or clipping outside.
  const clampedX = useTransform([rawLeft, rawRight, trackWidthMV], ([l, r, tw]: number[]) => {
    if (tw <= 0) return 0;
    const safeLeft = Math.max(0, Math.min(l, tw));
    const safeRight = Math.max(0, Math.min(r, tw));
    return Math.min(safeLeft, safeRight);
  });

  const clampedWidth = useTransform([rawLeft, rawRight, trackWidthMV], ([l, r, tw]: number[]) => {
    if (tw <= 0) return 0;
    const safeLeft = Math.max(0, Math.min(l, tw));
    const safeRight = Math.max(0, Math.min(r, tw));
    return Math.max(0, safeRight - safeLeft);
  });

  useLayoutEffect(() => {
    const syncToActiveTab = (animate: boolean) => {
      const trackEl = trackRef.current;
      const activeEl = tabRefs.current[selectedGroup];
      if (!trackEl || !activeEl) return;

      const trackWidth = trackEl.offsetWidth;
      if (trackWidth <= 0) return;

      const targetLeft = Math.max(0, activeEl.offsetLeft);
      const targetRight = Math.min(trackWidth, targetLeft + activeEl.offsetWidth);

      trackWidthMV.set(trackWidth);

      if (!hasInitializedRef.current || !animate || shouldReduceMotion) {
        rawLeft.jump(targetLeft);
        rawRight.jump(targetRight);
        hasInitializedRef.current = true;
      } else {
        rawLeft.set(targetLeft);
        rawRight.set(targetRight);
      }

      setIsReady(true);
    };

    const groupChanged = prevGroupRef.current !== selectedGroup;
    prevGroupRef.current = selectedGroup;

    syncToActiveTab(groupChanged);

    const handleResize = () => syncToActiveTab(false);
    window.addEventListener('resize', handleResize);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && trackRef.current) {
      observer = new ResizeObserver(handleResize);
      observer.observe(trackRef.current);
    }

    let cancelled = false;
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!cancelled) syncToActiveTab(false);
      });
    }

    return () => {
      cancelled = true;
      window.removeEventListener('resize', handleResize);
      observer?.disconnect();
    };
  }, [selectedGroup, shouldReduceMotion, rawLeft, rawRight, trackWidthMV]);

  return (
    <div
      className={`h-9 inline-flex items-center p-1 rounded-full border border-transparent transition-colors box-border shrink-0 overflow-hidden ${
        isDark ? 'bg-[#100F0E]' : 'bg-[#EAE8E2]'
      }`}
      role="tablist"
      aria-label="Filter schedule by Section or Lab Group"
    >
      <div
        ref={trackRef}
        className="relative h-full inline-flex items-center rounded-full overflow-hidden"
      >
        {/* Spring-driven active indicator pill strictly bounded within [0, trackWidth] */}
        <motion.div
          aria-hidden="true"
          style={{
            x: clampedX,
            width: clampedWidth,
            opacity: isReady ? 1 : 0,
          }}
          className={`absolute inset-y-0 left-0 rounded-full pointer-events-none will-change-transform transform-gpu ${
            isDark ? 'bg-stone-100 shadow-xs' : 'bg-stone-900 shadow-xs'
          }`}
        />
        {GROUP_OPTIONS.map((groupOption) => {
          const isSelected = selectedGroup === groupOption;
          return (
            <button
              key={groupOption}
              ref={(el) => {
                tabRefs.current[groupOption] = el;
              }}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => onSelectGroup(groupOption)}
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
  );
};
