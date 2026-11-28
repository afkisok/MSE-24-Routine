import type { Transition } from 'motion/react';

/**
 * Shared critically damped UI spring (ζ ≈ 1.01):
 * Matched to the collapsible Day column feel — snappy acceleration,
 * zero overshoot, seamlessly interruptible across modals, the group
 * filter pill, the collapsible Day rail, and horizontal timeline jumps.
 */
export const UNIFIED_SPRING = {
  type: 'spring',
  stiffness: 360,
  damping: 36,
  mass: 0.88,
} as const;

/**
 * Smooth, non-snapping transition for backdrop dimming and blur.
 */
export const UNIFIED_BACKDROP_TRANSITION: Transition = {
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1],
};

const STARTUP_OPACITY_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Editorial lift spring (ζ ≈ 0.93) for masthead lines, headings, and card copy on startup.
 */
export const STARTUP_TEXT_SPRING = {
  type: 'spring',
  stiffness: 360,
  damping: 32,
  mass: 0.82,
} as const;

/**
 * Tactile spring pop (ζ ≈ 0.83) for circular actions, pills, day badges, and class tiles on startup.
 */
export const STARTUP_POP_SPRING = {
  type: 'spring',
  stiffness: 410,
  damping: 29,
  mass: 0.75,
} as const;

/**
 * Decouples crisp opacity easing from smooth transform spring physics for editorial text/container entrances.
 */
export function startupTextTransition(delay = 0, opacityDuration = 0.24): Transition {
  return {
    opacity: { duration: opacityDuration, delay, ease: STARTUP_OPACITY_EASE },
    default: { ...STARTUP_TEXT_SPRING, delay },
  };
}

/**
 * Decouples crisp opacity easing from tactile spring pop physics for interactive controls and tiles.
 */
export function startupPopTransition(delay = 0, opacityDuration = 0.2): Transition {
  return {
    opacity: { duration: opacityDuration, delay, ease: STARTUP_OPACITY_EASE },
    default: { ...STARTUP_POP_SPRING, delay },
  };
}
