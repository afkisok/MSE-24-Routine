import type { Transition } from 'motion/react';

/**
 * Shared critically damped UI spring (ζ ≈ 1.011):
 * Matches the collapsible Day column's snappy response (stiffness 360, mass 0.88)
 * with critical damping (damping 36) for strictly zero overshoot and zero bounce.
 * Used consistently across the Day rail, modals/bottom sheets, group filter pill,
 * and horizontal timeline jump animations.
 */
export const UI_SPRING_CONFIG = {
  type: 'spring' as const,
  stiffness: 360,
  damping: 36,
  mass: 0.88,
};

export const UI_SPRING: Transition = UI_SPRING_CONFIG;
