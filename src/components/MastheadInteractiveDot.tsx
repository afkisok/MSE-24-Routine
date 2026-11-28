import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type Transition,
} from 'motion/react';

interface BurstParticle {
  id: number;
  angleDeg: number;
  distance: number;
  size: number;
  delay: number;
}

interface BurstEffect {
  id: number;
  stage: 1 | 2 | 3;
  particles: BurstParticle[];
}

interface MastheadInteractiveDotProps {
  variant: 'period' | 'question';
  crimsonTextClass: string;
  isDark: boolean;
  startupDelay?: number;
  textTransition: Transition;
}

const MAGNETIC_SPRING = { stiffness: 360, damping: 22, mass: 0.45 } as const;
const PRESS_SPRING: Transition = { type: 'spring', stiffness: 680, damping: 26, mass: 0.55 };
const SETTLE_SPRING: Transition = { type: 'spring', stiffness: 460, damping: 24, mass: 0.65 };
const STARTUP_SPRING: Transition = { type: 'spring', stiffness: 400, damping: 21, mass: 0.72 };

function createBurstParticles(burstId: number, stage: 1 | 2 | 3): BurstParticle[] {
  if (stage === 1) return [];
  const count = stage === 2 ? 3 : 5;
  const baseOffset = (burstId * 47) % 360;
  return Array.from({ length: count }, (_, idx) => {
    const spread = 360 / count;
    const jitter = ((burstId * 19 + idx * 31) % 24) - 12;
    return {
      id: idx,
      angleDeg: baseOffset + idx * spread + jitter,
      distance: stage === 3 ? 17 + (idx % 3) * 4 : 12 + (idx % 2) * 3,
      size: stage === 3 ? (idx % 2 === 0 ? 4 : 3) : 3,
      delay: idx * 0.015,
    };
  });
}

export const MastheadInteractiveDot: React.FC<MastheadInteractiveDotProps> = ({
  variant,
  crimsonTextClass,
  isDark,
  startupDelay = 0.22,
  textTransition,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const hitBoxRef = useRef<HTMLButtonElement | null>(null);

  const [isHovered, setIsHovered] = useState(false);
  const [bursts, setBursts] = useState<BurstEffect[]>([]);

  const isHoveredRef = useRef(false);
  const isPressedRef = useRef(false);
  const isAnimatingTapRef = useRef(false);
  const hasInteractedRef = useRef(false);
  const comboRef = useRef(0);
  const comboResetTimerRef = useRef<number | null>(null);
  const burstCounterRef = useRef(0);
  const flightIdRef = useRef(0);
  const animControlsRef = useRef<Array<{ stop: () => void }>>([]);

  // Core dot motion values (never remounted, always interruptible)
  const dotOpacity = useMotionValue(shouldReduceMotion ? 1 : 0);
  const dotX = useMotionValue(0);
  const dotY = useMotionValue(shouldReduceMotion ? 0 : -10);
  const dotScaleX = useMotionValue(shouldReduceMotion ? 1 : 0.56);
  const dotScaleY = useMotionValue(shouldReduceMotion ? 1 : 0.56);
  const dotRotate = useMotionValue(0);

  // Magnetic pointer offset (additive via useTransform so hover never fights bounce)
  const rawPointerX = useMotionValue(0);
  const rawPointerY = useMotionValue(0);
  const magX = useSpring(rawPointerX, MAGNETIC_SPRING);
  const magY = useSpring(rawPointerY, MAGNETIC_SPRING);
  const magRotate = useTransform(magX, [-5, 5], [-8, 8]);

  const combinedX = useTransform([dotX, magX], ([dx, mx]: number[]) => dx + mx);
  const combinedY = useTransform([dotY, magY], ([dy, my]: number[]) => dy + my);
  const combinedRotate = useTransform(
    [dotRotate, magRotate],
    ([dr, mr]: number[]) => dr + mr
  );

  // Sympathetic upper-hook recoil for `?` variant
  const hookY = useMotionValue(0);
  const hookRotate = useMotionValue(0);
  const hookScale = useMotionValue(1);

  const stopDotAnimations = useCallback(() => {
    animControlsRef.current.forEach((ctrl) => ctrl.stop());
    animControlsRef.current = [];
  }, []);

  const pushControls = (...controls: Array<{ stop: () => void }>) => {
    animControlsRef.current.push(...controls);
  };

  // Cold startup drop-in (skipped once user interacts or prefers reduced motion)
  useLayoutEffect(() => {
    if (shouldReduceMotion) {
      dotOpacity.jump(1);
      dotY.jump(0);
      dotScaleX.jump(1);
      dotScaleY.jump(1);
      return;
    }

    if (hasInteractedRef.current) return;

    dotOpacity.jump(0);
    dotY.jump(-10);
    dotScaleX.jump(0.56);
    dotScaleY.jump(0.56);

    const cOpacity = animate(dotOpacity, 1, {
      duration: 0.18,
      delay: startupDelay,
      ease: [0.22, 1, 0.36, 1],
    });
    const cY = animate(dotY, 0, { ...STARTUP_SPRING, delay: startupDelay });
    const cSx = animate(dotScaleX, 1, { ...STARTUP_SPRING, delay: startupDelay });
    const cSy = animate(dotScaleY, 1, { ...STARTUP_SPRING, delay: startupDelay });

    pushControls(cOpacity, cY, cSx, cSy);

    return () => {
      cOpacity.stop();
      cY.stop();
      cSx.stop();
      cSy.stop();
    };
  }, [dotOpacity, dotScaleX, dotScaleY, dotY, shouldReduceMotion, startupDelay]);

  useEffect(() => {
    return () => {
      stopDotAnimations();
      if (comboResetTimerRef.current !== null) {
        window.clearTimeout(comboResetTimerRef.current);
      }
    };
  }, [stopDotAnimations]);

  const spawnBurst = useCallback((stage: 1 | 2 | 3) => {
    const id = ++burstCounterRef.current;
    const particles = createBurstParticles(id, stage);
    setBursts((prev) => [...prev.slice(-3), { id, stage, particles }]);
    window.setTimeout(() => {
      setBursts((prev) => prev.filter((item) => item.id !== id));
    }, 620);
  }, []);

  const triggerPlayfulLaunch = useCallback(() => {
    hasInteractedRef.current = true;
    isPressedRef.current = false;

    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(12);
      }
    } catch {
      // Ignore unsupported haptic calls
    }

    if (comboResetTimerRef.current !== null) {
      window.clearTimeout(comboResetTimerRef.current);
    }
    comboRef.current += 1;
    const tapIndex = comboRef.current;
    const stage: 1 | 2 | 3 = tapIndex % 3 === 1 ? 1 : tapIndex % 3 === 2 ? 2 : 3;

    comboResetTimerRef.current = window.setTimeout(() => {
      comboRef.current = 0;
      comboResetTimerRef.current = null;
    }, 1750);

    stopDotAnimations();
    dotOpacity.set(1);

    if (shouldReduceMotion) {
      const targetScale = isHoveredRef.current ? 1.14 : 1;
      pushControls(
        animate(dotScaleX, [1.22, targetScale], { duration: 0.22, ease: [0.22, 1, 0.36, 1] }),
        animate(dotScaleY, [0.82, targetScale], { duration: 0.22, ease: [0.22, 1, 0.36, 1] })
      );
      return;
    }

    isAnimatingTapRef.current = true;
    const flightId = ++flightIdRef.current;
    spawnBurst(stage);

    const restScale = isHoveredRef.current ? 1.18 : 1;
    const dir = tapIndex % 2 === 1 ? 1 : -1;
    const isPeriod = variant === 'period';
    const startY = dotY.get();
    const startSx = dotScaleX.get();
    const startSy = dotScaleY.get();
    const normalizedRot = (((dotRotate.get() % 360) + 540) % 360) - 180;
    dotRotate.jump(normalizedRot);

    const finishTapFlight = () => {
      if (flightIdRef.current !== flightId) return;
      isAnimatingTapRef.current = false;
      const targetScale = isHoveredRef.current ? 1.18 : 1;
      pushControls(
        animate(dotScaleX, targetScale, SETTLE_SPRING),
        animate(dotScaleY, targetScale, SETTLE_SPRING)
      );
    };

    if (stage === 1) {
      // Stage 1: Crisp superball single-rebound bounce with baseline impact squash
      const peakY = isPeriod ? -15 : -9.5;
      const reboundY = isPeriod ? -3.8 : -2.2;
      const duration = 0.5;

      const cY = animate(dotY, [Math.max(startY, 1.5), peakY, 0, reboundY, 0], {
        duration,
        times: [0, 0.34, 0.66, 0.83, 1],
        ease: ['easeOut', 'easeIn', 'easeOut', 'easeIn'],
      });
      const cSx = animate(
        dotScaleX,
        [Math.max(startSx, 1.24), 0.8, 1.26, 0.92, restScale],
        {
          duration,
          times: [0, 0.26, 0.66, 0.84, 1],
          ease: 'easeInOut',
        }
      );
      const cSy = animate(
        dotScaleY,
        [Math.min(startSy, 0.78), 1.32, 0.74, 1.12, restScale],
        {
          duration,
          times: [0, 0.26, 0.66, 0.84, 1],
          ease: 'easeInOut',
        }
      );
      const cRot = animate(dotRotate, [normalizedRot, dir * -10, dir * 6, 0], {
        duration,
        times: [0, 0.34, 0.7, 1],
        ease: 'easeInOut',
      });
      const cX = animate(dotX, 0, SETTLE_SPRING);

      pushControls(cY, cSx, cSy, cRot, cX);
      cY.then(finishTapFlight);
    } else if (stage === 2) {
      // Stage 2: High playful lateral double-boing arc
      const peakY = isPeriod ? -21 : -12.5;
      const reboundY = isPeriod ? -6.5 : -3.8;
      const duration = 0.62;

      const cY = animate(dotY, [Math.max(startY, 1.8), peakY, 0, reboundY, 0], {
        duration,
        times: [0, 0.34, 0.64, 0.82, 1],
        ease: ['easeOut', 'easeIn', 'easeOut', 'easeIn'],
      });
      const cX = animate(dotX, [0, dir * 5.5, dir * 1.5, -dir * 2.2, 0], {
        duration,
        times: [0, 0.32, 0.64, 0.84, 1],
        ease: 'easeInOut',
      });
      const cSx = animate(
        dotScaleX,
        [Math.max(startSx, 1.28), 0.76, 1.3, 0.88, restScale],
        {
          duration,
          times: [0, 0.24, 0.64, 0.82, 1],
          ease: 'easeInOut',
        }
      );
      const cSy = animate(
        dotScaleY,
        [Math.min(startSy, 0.74), 1.36, 0.7, 1.16, restScale],
        {
          duration,
          times: [0, 0.24, 0.64, 0.82, 1],
          ease: 'easeInOut',
        }
      );
      const cRot = animate(dotRotate, [normalizedRot, dir * 20, -dir * 14, dir * 5, 0], {
        duration,
        times: [0, 0.34, 0.64, 0.85, 1],
        ease: 'easeInOut',
      });

      pushControls(cY, cX, cSx, cSy, cRot);
      cY.then(finishTapFlight);
    } else {
      // Stage 3: Full 360-degree celebratory flip + twin bounce + ink burst
      const peakY = isPeriod ? -25 : -14.5;
      const reboundY = isPeriod ? -8 : -4.5;
      const duration = 0.7;

      const cY = animate(dotY, [Math.max(startY, 2), peakY, 0, reboundY, 0], {
        duration,
        times: [0, 0.35, 0.65, 0.84, 1],
        ease: ['easeOut', 'easeIn', 'easeOut', 'easeIn'],
      });
      const cX = animate(dotX, [0, dir * 4.5, -dir * 2.5, 0], {
        duration,
        times: [0, 0.36, 0.72, 1],
        ease: 'easeInOut',
      });
      const cSx = animate(
        dotScaleX,
        [Math.max(startSx, 1.32), 0.78, 1.34, 0.88, restScale],
        {
          duration,
          times: [0, 0.22, 0.65, 0.84, 1],
          ease: 'easeInOut',
        }
      );
      const cSy = animate(
        dotScaleY,
        [Math.min(startSy, 0.7), 1.34, 0.68, 1.18, restScale],
        {
          duration,
          times: [0, 0.22, 0.65, 0.84, 1],
          ease: 'easeInOut',
        }
      );
      const cRot = animate(dotRotate, [normalizedRot, dir * 360], {
        duration: 0.56,
        ease: [0.22, 1, 0.36, 1],
      });
      cRot.then(() => {
        if (flightIdRef.current !== flightId) return;
        dotRotate.jump(0);
      });

      pushControls(cY, cX, cSx, cSy, cRot);
      cY.then(finishTapFlight);
    }

    // Sympathetic recoil on the `?` upper curve so the punctuation plays together
    if (!isPeriod) {
      const bumpY = stage === 3 ? -4.5 : stage === 2 ? -3.4 : -2.2;
      const tiltDeg = (stage === 3 ? 9 : stage === 2 ? 6.5 : 4.5) * dir;
      pushControls(
        animate(hookY, [0, bumpY, 0.6, 0], {
          duration: 0.42,
          times: [0, 0.32, 0.72, 1],
          ease: 'easeInOut',
        }),
        animate(hookRotate, [0, tiltDeg, -tiltDeg * 0.35, 0], {
          duration: 0.44,
          times: [0, 0.34, 0.74, 1],
          ease: 'easeInOut',
        }),
        animate(hookScale, [1, 1.05, 0.98, 1], {
          duration: 0.38,
          times: [0, 0.32, 0.72, 1],
          ease: 'easeInOut',
        })
      );
    }
  }, [
    dotOpacity,
    dotRotate,
    dotScaleX,
    dotScaleY,
    dotX,
    dotY,
    hookRotate,
    hookScale,
    hookY,
    shouldReduceMotion,
    spawnBurst,
    stopDotAnimations,
    variant,
  ]);

  const handlePointerEnter = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'touch') return;
    hasInteractedRef.current = true;
    isHoveredRef.current = true;
    setIsHovered(true);
    dotOpacity.set(1);

    if (shouldReduceMotion || isAnimatingTapRef.current) return;

    stopDotAnimations();
    // Playful hover perk-up: subtle plump + mini-hop so desktop users notice it's alive
    const hopPeak = variant === 'period' ? -4.5 : -3;
    pushControls(
      animate(dotY, [0, hopPeak, 0], {
        duration: 0.28,
        times: [0, 0.45, 1],
        ease: ['easeOut', 'easeIn'],
      }),
      animate(dotScaleX, [1, 0.9, 1.18], {
        duration: 0.28,
        times: [0, 0.42, 1],
        ease: 'easeOut',
      }),
      animate(dotScaleY, [1, 1.16, 1.18], {
        duration: 0.28,
        times: [0, 0.42, 1],
        ease: 'easeOut',
      })
    );
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'touch' || shouldReduceMotion) return;
    const rect = hitBoxRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height * 0.74;
    const dx = Math.max(-5, Math.min(5, (e.clientX - centerX) * 0.26));
    const dy = Math.max(-4.5, Math.min(4.5, (e.clientY - centerY) * 0.26));
    rawPointerX.set(dx);
    rawPointerY.set(dy);
  };

  const handlePointerLeave = () => {
    isHoveredRef.current = false;
    isPressedRef.current = false;
    setIsHovered(false);
    rawPointerX.set(0);
    rawPointerY.set(0);

    if (isAnimatingTapRef.current) return;

    stopDotAnimations();
    if (shouldReduceMotion) {
      dotScaleX.set(1);
      dotScaleY.set(1);
      dotY.set(0);
      return;
    }

    pushControls(
      animate(dotX, 0, SETTLE_SPRING),
      animate(dotY, 0, SETTLE_SPRING),
      animate(dotScaleX, 1, SETTLE_SPRING),
      animate(dotScaleY, 1, SETTLE_SPRING),
      animate(dotRotate, 0, SETTLE_SPRING)
    );
  };

  const handlePointerDown = () => {
    hasInteractedRef.current = true;
    flightIdRef.current += 1;
    isPressedRef.current = true;
    isAnimatingTapRef.current = false;
    dotOpacity.set(1);

    if (shouldReduceMotion) return;

    stopDotAnimations();
    // Tactile baseline squash anticipation before release
    pushControls(
      animate(dotY, 1.8, PRESS_SPRING),
      animate(dotScaleX, 1.34, PRESS_SPRING),
      animate(dotScaleY, 0.68, PRESS_SPRING)
    );

    if (variant === 'question') {
      pushControls(
        animate(hookY, 1.2, PRESS_SPRING),
        animate(hookRotate, -4, PRESS_SPRING)
      );
    }
  };

  const handlePointerCancel = () => {
    isPressedRef.current = false;
    rawPointerX.set(0);
    rawPointerY.set(0);
    if (isAnimatingTapRef.current) return;
    stopDotAnimations();
    const restScale = isHoveredRef.current ? 1.18 : 1;
    pushControls(
      animate(dotY, 0, SETTLE_SPRING),
      animate(dotScaleX, restScale, SETTLE_SPRING),
      animate(dotScaleY, restScale, SETTLE_SPRING),
      animate(hookY, 0, SETTLE_SPRING),
      animate(hookRotate, 0, SETTLE_SPRING)
    );
  };

  const accentHex = isDark ? '#E5484D' : '#9E2C2C';

  return (
    <button
      ref={hitBoxRef}
      type="button"
      onClick={triggerPlayfulLaunch}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerCancel={handlePointerCancel}
      aria-label={
        variant === 'question'
          ? 'Playful interactive question mark'
          : 'Playful interactive period'
      }
      className="relative inline-block align-baseline p-0 m-0 border-0 bg-transparent font-[inherit] text-[length:inherit] font-semibold leading-none tracking-[inherit] cursor-pointer select-none touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5484D]/50 rounded-md"
    >
      {/* Generous invisible pointer/touch hitbox without shifting surrounding serif kerning */}
      <span aria-hidden="true" className="absolute -inset-x-3 -inset-y-2 z-20" />

      {/* Transient crimson ripple + micro ink droplets centered at the visible dot */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 bottom-[0.14em] w-0 h-0 z-0"
      >
        {bursts.map((burst) => (
          <React.Fragment key={burst.id}>
            <motion.span
              initial={{ scale: 0.35, opacity: isDark ? 0.72 : 0.56 }}
              animate={{
                scale: burst.stage === 3 ? 3.1 : burst.stage === 2 ? 2.6 : 2.1,
                opacity: 0,
              }}
              transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
              style={{
                borderColor: accentHex,
              }}
              className="absolute -left-2 -top-2 w-4 h-4 rounded-full border-[1.5px] will-change-transform"
            />
            {burst.particles.map((particle) => {
              const rad = (particle.angleDeg * Math.PI) / 180;
              const tx = Math.cos(rad) * particle.distance;
              const ty = Math.sin(rad) * particle.distance;
              return (
                <motion.span
                  key={particle.id}
                  initial={{ x: 0, y: 0, scale: 1.05, opacity: 0.95 }}
                  animate={{
                    x: tx,
                    y: ty + 3,
                    scale: 0,
                    opacity: 0,
                  }}
                  transition={{
                    duration: 0.48,
                    delay: particle.delay,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  style={{
                    width: particle.size,
                    height: particle.size,
                    marginLeft: -particle.size / 2,
                    marginTop: -particle.size / 2,
                    backgroundColor: accentHex,
                  }}
                  className="absolute left-0 top-0 rounded-full will-change-transform"
                />
              );
            })}
          </React.Fragment>
        ))}

        {/* Subtle warm hover halo strictly visible while hovered */}
        <motion.span
          animate={{
            scale: isHovered ? 1 : 0.4,
            opacity: isHovered ? (isDark ? 0.24 : 0.14) : 0,
          }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          style={{ backgroundColor: accentHex }}
          className="absolute -left-2.5 -top-2.5 w-5 h-5 rounded-full blur-[4px]"
        />
      </span>

      {variant === 'period' ? (
        <motion.span
          style={{
            opacity: dotOpacity,
            x: combinedX,
            y: combinedY,
            scaleX: dotScaleX,
            scaleY: dotScaleY,
            rotate: combinedRotate,
            transformOrigin: '50% 78%',
          }}
          className={`relative z-10 inline-block leading-none will-change-transform ${crimsonTextClass}`}
        >
          .
        </motion.span>
      ) : (
        <span className="relative z-10 inline-block leading-none">
          {/* Upper question curve: enters with masthead line and sympathetically recoils when dot bounces */}
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={textTransition}
            className="inline-block leading-none"
          >
            <motion.span
              style={{
                y: hookY,
                rotate: hookRotate,
                scale: hookScale,
                clipPath: 'inset(0 0 45% 0)',
                transformOrigin: '50% 45%',
              }}
              className="inline-block leading-none will-change-transform"
            >
              ?
            </motion.span>
          </motion.span>

          {/* Lower crimson dot of the question mark */}
          <motion.span
            aria-hidden="true"
            style={{
              opacity: dotOpacity,
              x: combinedX,
              y: combinedY,
              scaleX: dotScaleX,
              scaleY: dotScaleY,
              rotate: combinedRotate,
              clipPath: 'inset(55% 0 0 0)',
              transformOrigin: '50% 78%',
            }}
            className={`pointer-events-none select-none absolute inset-0 inline-block leading-none will-change-transform ${crimsonTextClass}`}
          >
            ?
          </motion.span>
        </span>
      )}
    </button>
  );
};
