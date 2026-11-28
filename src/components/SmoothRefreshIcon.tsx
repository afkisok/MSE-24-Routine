import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useMotionValue } from 'motion/react';
import { Check, RefreshCw } from 'lucide-react';
import { CARD_INTERACTION_SPRING } from '../utils/springs';

interface SmoothRefreshIconProps {
  isSyncing: boolean;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  className?: string;
  showSuccessCheck?: boolean;
  successClassName?: string;
}

/**
 * Momentum-preserving refresh icon that smoothly spins during sync,
 * coasts with zero overshoot to an exact upright 360° landing (never snapping mid-turn),
 * and optionally morphs briefly into a confirmation checkmark on completion.
 */
export const SmoothRefreshIcon: React.FC<SmoothRefreshIconProps> = ({
  isSyncing,
  syncStatus,
  className = 'w-4 h-4 block',
  showSuccessCheck = false,
  successClassName = 'text-emerald-600 dark:text-emerald-400',
}) => {
  const [showCheck, setShowCheck] = useState(false);
  const rotate = useMotionValue(0);
  const animControlsRef = useRef<ReturnType<typeof animate> | null>(null);
  const wasSyncingRef = useRef(false);
  const spinStartedAtRef = useRef(0);
  const animTokenRef = useRef(0);
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearCheckTimer = () => {
      if (checkTimerRef.current) {
        clearTimeout(checkTimerRef.current);
        checkTimerRef.current = null;
      }
    };

    if (isSyncing) {
      clearCheckTimer();
      setShowCheck(false);
      wasSyncingRef.current = true;
      animTokenRef.current += 1;
      animControlsRef.current?.stop();

      const startAngle = ((rotate.get() % 360) + 360) % 360;
      rotate.set(startAngle);
      spinStartedAtRef.current = performance.now();

      animControlsRef.current = animate(rotate, startAngle + 360, {
        duration: 0.72,
        ease: 'linear',
        repeat: Infinity,
        repeatType: 'loop',
      });
      return;
    }

    if (wasSyncingRef.current) {
      wasSyncingRef.current = false;
      const token = ++animTokenRef.current;
      const elapsed = performance.now() - spinStartedAtRef.current;
      const currentRaw = rotate.get();
      animControlsRef.current?.stop();

      const normalized = ((currentRaw % 360) + 360) % 360;
      rotate.set(normalized);

      // Guarantee a full, graceful coast to exact upright 0° (mod 360°) with zero sudden brake
      let targetAngle = 360;
      if (elapsed < 440 && normalized < 200) {
        targetAngle = 360;
      } else if (360 - normalized < 100) {
        targetAngle = 720;
      }

      const controls = animate(rotate, targetAngle, {
        type: 'spring',
        stiffness: 120,
        damping: 24,
        mass: 0.9,
        velocity: 500, // Matches 360deg / 0.72s angular speed seamlessly
        restDelta: 0.5,
        restSpeed: 2,
      });
      animControlsRef.current = controls;

      controls.then(() => {
        if (animTokenRef.current !== token) return;
        rotate.set(0);

        if (showSuccessCheck && syncStatus === 'success') {
          setShowCheck(true);
          clearCheckTimer();
          checkTimerRef.current = setTimeout(() => {
            if (animTokenRef.current !== token) return;
            setShowCheck(false);
          }, 1150);
        }
      });
    }
  }, [isSyncing, syncStatus, showSuccessCheck, rotate]);

  useEffect(() => {
    return () => {
      animTokenRef.current += 1;
      animControlsRef.current?.stop();
      if (checkTimerRef.current) {
        clearTimeout(checkTimerRef.current);
      }
    };
  }, []);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {showCheck ? (
        <motion.span
          key="refresh-check"
          initial={{ scale: 0.55, rotate: -30, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          exit={{ scale: 0.65, rotate: 20, opacity: 0 }}
          transition={CARD_INTERACTION_SPRING}
          className={`inline-flex items-center justify-center leading-none ${successClassName}`}
        >
          <Check className={className} strokeWidth={2.4} />
        </motion.span>
      ) : (
        <motion.span
          key="refresh-spin"
          initial={{ scale: 0.75, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.65, opacity: 0 }}
          transition={CARD_INTERACTION_SPRING}
          style={{ rotate }}
          className="inline-flex items-center justify-center leading-none will-change-transform"
        >
          <RefreshCw className={className} />
        </motion.span>
      )}
    </AnimatePresence>
  );
};
