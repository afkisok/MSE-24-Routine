import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  animate,
  motion,
  useDragControls,
  useMotionValue,
  usePresence,
  useReducedMotion,
  type MotionValue,
  type PanInfo,
  type Transition,
} from 'motion/react';

/**
 * Shared MotionValue bridge tying the active bottom sheet's live `y` translation
 * and measured dismiss height directly to the background page depth & backdrop blur.
 */
export interface BottomSheetMotionContextValue {
  sheetY: MotionValue<number>;
  sheetHeight: MotionValue<number>;
}

export const BottomSheetMotionContext =
  createContext<BottomSheetMotionContextValue | null>(null);

/**
 * Strictly critically damped spring (ζ ≈ 1.005):
 * Full precision for unitless scale, borderRadius, and opening transitions.
 */
export const BOTTOM_SHEET_SPRING: Transition = {
  type: 'spring',
  stiffness: 440,
  damping: 40,
  mass: 0.9,
};

/**
 * Pixel-scoped exit spring so AnimatePresence unmounts deterministically
 * right after the sheet clears the viewport (never used for unitless scale).
 */
const BOTTOM_SHEET_EXIT_SPRING: Transition = {
  type: 'spring',
  stiffness: 440,
  damping: 40,
  mass: 0.9,
  restDelta: 0.5,
  restSpeed: 5,
};

export const BACKDROP_TRANSITION: Transition = {
  duration: 0.3,
  ease: [0.22, 1, 0.36, 1],
};

const HANDLE_SPRING: Transition = {
  type: 'spring',
  stiffness: 520,
  damping: 32,
  mass: 0.7,
};

interface GrabHandleProps {
  isDark: boolean;
  setterRef: React.MutableRefObject<((grabbed: boolean) => void) | null>;
  onGrabPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
}

/**
 * Isolated grab handle component so pressing or dragging never triggers a re-render
 * on the parent draggable motion.div sheet.
 * Hitbox is tightly bounded to a ~30% expanded region around the handle pill itself.
 */
const GrabHandle: React.FC<GrabHandleProps> = ({ isDark, setterRef, onGrabPointerDown }) => {
  const [isGrabbed, setIsGrabbed] = useState(false);

  useEffect(() => {
    setterRef.current = setIsGrabbed;
    return () => {
      setterRef.current = null;
    };
  }, [setterRef]);

  useEffect(() => {
    if (!isGrabbed) return;
    const handleRelease = () => setIsGrabbed(false);
    window.addEventListener('pointerup', handleRelease);
    window.addEventListener('pointercancel', handleRelease);
    return () => {
      window.removeEventListener('pointerup', handleRelease);
      window.removeEventListener('pointercancel', handleRelease);
    };
  }, [isGrabbed]);

  return (
    <div className="flex justify-center -mt-2.5 mb-0.5">
      <div
        onPointerDown={(e) => {
          setIsGrabbed(true);
          onGrabPointerDown(e);
        }}
        className="inline-flex items-center justify-center px-2 py-2.5 rounded-full cursor-grab active:cursor-grabbing touch-none select-none"
      >
        <motion.div
          animate={{
            scaleX: isGrabbed ? 1.24 : 1,
            scaleY: isGrabbed ? 1.18 : 1,
          }}
          transition={HANDLE_SPRING}
          className={`w-12 h-1.5 rounded-full origin-center transition-colors duration-150 ${
            isGrabbed
              ? isDark
                ? 'bg-stone-500'
                : 'bg-stone-400'
              : isDark
              ? 'bg-stone-700'
              : 'bg-stone-300'
          }`}
        />
      </div>
    </div>
  );
};

interface BottomSheetModalProps {
  onClose: () => void;
  theme?: 'light' | 'dark';
  ariaLabel?: string;
  ariaLabelledBy?: string;
  sheetClassName?: string;
  renderHeader: (handle: React.ReactNode) => React.ReactNode;
  children: React.ReactNode;
}

/**
 * Tactile, gesture-driven iOS-style bottom sheet modal wrapper.
 * - Single shared `sheetY` MotionValue drives both sheet position and background depth/blur 1:1
 * - Critically damped, zero-bounce, interruptible spring with deterministic exit completion
 * - Vertical thumb drag (`drag="y"`) with upward rubber-banding (`top: 0.08`) clamped for background depth
 * - Dismisses on drag > 100px or downward flick velocity > 500px/s; otherwise springs smoothly to y: 0
 */
export const BottomSheetModal: React.FC<BottomSheetModalProps> = ({
  onClose,
  theme = 'light',
  ariaLabel,
  ariaLabelledBy,
  sheetClassName = '',
  renderHeader,
  children,
}) => {
  const isDark = theme === 'dark';
  const [isPresent, safeToRemove] = usePresence();
  const shouldReduceMotion = useReducedMotion();
  const isPresentRef = useRef(isPresent);
  isPresentRef.current = isPresent;
  const dragControls = useDragControls();
  const grabSetterRef = useRef<((grabbed: boolean) => void) | null>(null);
  const sheetCardRef = useRef<HTMLDivElement | null>(null);
  const activeAnimRef = useRef<{ stop: () => void } | null>(null);
  const dismissVelocityRef = useRef<number>(0);

  const sharedMotion = useContext(BottomSheetMotionContext);
  const localSheetY = useMotionValue<number>(640);
  const localSheetHeight = useMotionValue<number>(640);
  const sheetY = sharedMotion?.sheetY ?? localSheetY;
  const sheetHeight = sharedMotion?.sheetHeight ?? localSheetHeight;

  /**
   * Computes the exact vertical travel distance from resting detent (y = 0)
   * to fully off-screen below the viewport:
   * - Mobile (< 640px): anchored at bottom-0, so travel equals the card's actual height
   * - Desktop (>= 640px): vertically centered, so travel equals half viewport + half card height
   */
  const computeDismissRange = useCallback((): number => {
    if (typeof window === 'undefined') return 640;
    const cardHeight = sheetCardRef.current?.offsetHeight ?? 0;
    if (window.innerWidth >= 640) {
      const effectiveCard = Math.max(cardHeight, Math.round(window.innerHeight * 0.45));
      return Math.round((window.innerHeight + effectiveCard) / 2) + 24;
    }
    if (cardHeight > 0) {
      return Math.max(cardHeight, 260);
    }
    return Math.round(window.innerHeight * 0.65);
  }, []);

  // Synchronously measure card height before first paint, park sheetY off-screen, and spring open to y = 0
  useLayoutEffect(() => {
    const dismissRange = computeDismissRange();
    const startOffscreenY =
      typeof window !== 'undefined' && window.innerWidth < 640
        ? dismissRange + 36
        : dismissRange;

    sheetHeight.set(dismissRange);
    activeAnimRef.current?.stop();

    if (shouldReduceMotion) {
      sheetY.jump(0);
      return;
    }

    sheetY.jump(startOffscreenY);
    activeAnimRef.current = animate(sheetY, 0, BOTTOM_SHEET_SPRING);
  }, [computeDismissRange, sheetHeight, sheetY, shouldReduceMotion]);

  // Keep sheetHeight synced on viewport resizes or dynamic content height changes
  useEffect(() => {
    const syncRange = () => {
      const nextRange = computeDismissRange();
      sheetHeight.set(nextRange);
    };

    window.addEventListener('resize', syncRange);
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && sheetCardRef.current) {
      observer = new ResizeObserver(syncRange);
      observer.observe(sheetCardRef.current);
    }

    return () => {
      window.removeEventListener('resize', syncRange);
      observer?.disconnect();
    };
  }, [computeDismissRange, sheetHeight]);

  // Animate sheetY smoothly off-screen on exit while keeping background scale/blur locked 1:1
  useEffect(() => {
    if (isPresent) return;

    activeAnimRef.current?.stop();
    const dismissRange = computeDismissRange();
    sheetHeight.set(dismissRange);

    const targetExitY =
      typeof window !== 'undefined' && window.innerWidth < 640
        ? dismissRange + 48
        : dismissRange + 24;

    if (shouldReduceMotion) {
      sheetY.jump(targetExitY);
      safeToRemove();
      return;
    }

    const releaseVelocity = dismissVelocityRef.current;
    dismissVelocityRef.current = 0;

    let cancelled = false;
    const controls = animate(sheetY, targetExitY, {
      ...BOTTOM_SHEET_EXIT_SPRING,
      ...(releaseVelocity > 0 ? { velocity: releaseVelocity } : {}),
    });
    activeAnimRef.current = controls;

    controls.then(() => {
      if (cancelled) return;
      sheetY.jump(targetExitY);
      safeToRemove();
    });

    return () => {
      cancelled = true;
      controls.stop();
    };
  }, [isPresent, computeDismissRange, sheetHeight, sheetY, shouldReduceMotion, safeToRemove]);

  // Defensive cleanup on unmount so background depth is never left stuck non-zero
  useEffect(() => {
    return () => {
      activeAnimRef.current?.stop();
      activeAnimRef.current = null;
      const finalRange = Math.max(sheetHeight.get(), 260);
      if (sheetY.get() < finalRange) {
        sheetY.jump(finalRange);
      }
    };
  }, [sheetHeight, sheetY]);

  const handleClose = useCallback(() => {
    grabSetterRef.current?.(false);
    onClose();
  }, [onClose]);

  // Escape key dismissal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  const handleDragStart = () => {
    activeAnimRef.current?.stop();
    activeAnimRef.current = null;
    dismissVelocityRef.current = 0;
    grabSetterRef.current?.(true);
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    grabSetterRef.current?.(false);
    const shouldDismiss =
      (info.offset.y > 100 && info.velocity.y >= -200) ||
      (info.offset.y > 24 && info.velocity.y > 500);

    if (shouldDismiss) {
      dismissVelocityRef.current = Math.max(0, info.velocity.y);
      handleClose();
      return;
    }

    activeAnimRef.current?.stop();
    activeAnimRef.current = animate(sheetY, 0, {
      ...BOTTOM_SHEET_SPRING,
      velocity: Math.max(-1200, Math.min(info.velocity.y, 400)),
    });
  };

  const handleGrabPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isPresentRef.current) return;
      dragControls.start(e);
    },
    [dragControls]
  );

  const grabHandle = (
    <GrabHandle
      isDark={isDark}
      setterRef={grabSetterRef}
      onGrabPointerDown={handleGrabPointerDown}
    />
  );

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none overscroll-y-contain overflow-visible pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
    >
      {/* Full-screen click-catcher stays pointer-events-auto for the modal's entire mounted lifecycle */}
      <div
        aria-hidden="true"
        onClick={(e) => {
          e.stopPropagation();
          handleClose();
        }}
        className="fixed inset-0 z-0 pointer-events-auto"
      />

      {/* Gesture-driven critically damped spring bottom sheet anchored flush to bottom-0 on mobile */}
      <motion.div
        ref={sheetCardRef}
        drag={isPresent ? 'y' : false}
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0.08, bottom: 0.45 }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{ y: sheetY, overscrollBehaviorY: 'contain' }}
        onClick={(e) => e.stopPropagation()}
        className="fixed bottom-0 inset-x-0 mx-auto sm:relative sm:bottom-auto sm:inset-x-auto sm:mx-0 z-10 w-full max-w-lg overflow-visible will-change-transform transform-gpu pointer-events-auto"
      >
        <div
          data-modal-scrollable="true"
          className={`relative z-10 w-full rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[90vh] border border-b-0 sm:border-b overscroll-y-contain no-scrollbar ${
            isDark
              ? 'bg-[#1E1D1C] border-transparent text-stone-100 shadow-[0_-12px_40px_-8px_rgba(0,0,0,0.75)] sm:shadow-2xl sm:shadow-black/80'
              : 'bg-white border-stone-200 text-stone-900 shadow-[0_-10px_36px_-8px_rgba(28,25,23,0.18)] sm:shadow-2xl sm:shadow-stone-900/20'
          } ${sheetClassName}`}
        >
          <div className="shrink-0">
            {renderHeader(grabHandle)}
          </div>

          {children}
        </div>

        {/* Dedicated solid bottom skirt anchored directly below the draggable sheet so upward overscroll never reveals background */}
        <div
          aria-hidden="true"
          className={`sm:hidden pointer-events-none absolute top-full left-0 right-0 -mt-px h-40 z-20 border-x ${
            isDark
              ? 'bg-[#1E1D1C] border-transparent'
              : 'bg-white border-stone-200'
          }`}
        />
      </motion.div>
    </motion.div>
  );
};
