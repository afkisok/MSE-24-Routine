import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  animate,
  motion,
  useIsPresent,
  useMotionValue,
  type PanInfo,
  type Transition,
} from 'motion/react';

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
}

/**
 * Isolated grab handle component so pressing or dragging never triggers a re-render
 * on the parent draggable motion.div sheet.
 */
const GrabHandle: React.FC<GrabHandleProps> = ({ isDark, setterRef }) => {
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
    <div
      className="flex justify-center -mt-1 mb-3 pt-1 cursor-grab active:cursor-grabbing touch-none"
      onPointerDown={() => setIsGrabbed(true)}
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
 * - Critically damped, zero-bounce, interruptible spring with deterministic exit completion
 * - Always keeps backdrop pointer-events locked (pointer-events-auto) until fully unmounted
 * - Direct, unlocked close handler so Close button, backdrop taps, Escape, and drag always work
 * - Vertical thumb drag (`drag="y"`) with upward rubber-banding (`top: 0.08`)
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
  const isPresent = useIsPresent();
  const grabSetterRef = useRef<((grabbed: boolean) => void) | null>(null);
  const sheetCardRef = useRef<HTMLDivElement | null>(null);
  const snapBackAnimRef = useRef<{ stop: () => void } | null>(null);

  const computeOffscreenY = useCallback((): number => {
    if (typeof window === 'undefined') return 900;
    if (window.innerWidth >= 640) {
      return Math.round(window.innerHeight * 1.05);
    }
    const cardHeight = sheetCardRef.current?.offsetHeight ?? 0;
    return Math.max(cardHeight + 48, Math.round(window.innerHeight * 0.92));
  }, []);

  const [exitY, setExitY] = useState<number>(() => computeOffscreenY());
  const initialYRef = useRef<number>(exitY);
  const sheetY = useMotionValue<number>(initialYRef.current);

  useEffect(() => {
    const updateExitY = () => setExitY(computeOffscreenY());
    updateExitY();
    window.addEventListener('resize', updateExitY);
    return () => window.removeEventListener('resize', updateExitY);
  }, [computeOffscreenY]);

  useEffect(() => {
    return () => {
      snapBackAnimRef.current?.stop();
      snapBackAnimRef.current = null;
    };
  }, []);

  const handleClose = useCallback(() => {
    snapBackAnimRef.current?.stop();
    snapBackAnimRef.current = null;
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
    snapBackAnimRef.current?.stop();
    snapBackAnimRef.current = null;
    grabSetterRef.current?.(true);
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    grabSetterRef.current?.(false);
    if (info.offset.y > 100 || info.velocity.y > 500) {
      handleClose();
      return;
    }
    snapBackAnimRef.current?.stop();
    snapBackAnimRef.current = animate(sheetY, 0, BOTTOM_SHEET_SPRING);
  };

  const grabHandle = <GrabHandle isDark={isDark} setterRef={grabSetterRef} />;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none overscroll-y-contain pointer-events-auto"
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

      {/* Gesture-driven critically damped spring bottom sheet */}
      <motion.div
        ref={sheetCardRef}
        initial={{ y: initialYRef.current }}
        animate={{ y: 0 }}
        exit={{ y: exitY, transition: BOTTOM_SHEET_EXIT_SPRING }}
        transition={BOTTOM_SHEET_SPRING}
        drag={isPresent ? 'y' : false}
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0.08, bottom: 0.45 }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{ y: sheetY, overscrollBehaviorY: 'contain' }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-lg will-change-transform transform-gpu pointer-events-auto"
      >
        {/* Mobile bottom apron seals the bottom edge during upward rubber-banding */}
        <div
          aria-hidden="true"
          className={`sm:hidden pointer-events-none absolute inset-x-0 top-[calc(100%-2px)] h-20 ${
            isDark ? 'bg-[#1E1D1C]' : 'bg-white'
          }`}
        />

        <div
          className={`relative w-full rounded-t-[28px] sm:rounded-[28px] shadow-2xl flex flex-col max-h-[90vh] border overscroll-y-contain no-scrollbar ${
            isDark
              ? 'bg-[#1E1D1C] border-transparent text-stone-100 shadow-black/80'
              : 'bg-white border-stone-200 text-stone-900 shadow-stone-900/20'
          } ${sheetClassName}`}
        >
          <div
            onPointerDown={() => grabSetterRef.current?.(true)}
            className="cursor-grab active:cursor-grabbing shrink-0 touch-none"
          >
            {renderHeader(grabHandle)}
          </div>

          {children}
        </div>
      </motion.div>
    </motion.div>
  );
};
