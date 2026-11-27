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
