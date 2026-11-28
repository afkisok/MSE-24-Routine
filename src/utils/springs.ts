import type { Transition } from 'motion/react';

/**
 * Shared exponential ease-out curve across tween transitions.
 */
export const EASE_OUT_EXPO: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Crisp tactile spring (ζ ≈ 0.71) for buttons, segmented tabs, pills, and grab handles.
 */
export const TACTILE_SPRING = {
  type: 'spring',
  stiffness: 480,
  damping: 26,
  mass: 0.7,
} as const;

/**
 * Balanced interaction spring (ζ ≈ 0.77) for cards, list rows, and icon morphs.
 */
export const CARD_INTERACTION_SPRING = {
  type: 'spring',
  stiffness: 420,
  damping: 28,
  mass: 0.78,
} as const;

/**
 * Shared subtle UI spring (ζ ≈ 0.77):
 * Gives the collapsible Day rail and Day cards tactile acceleration and a
 * subtle organic settle while remaining crisp and seamlessly interruptible.
 */
export const UNIFIED_SPRING = {
  type: 'spring',
  stiffness: 360,
  damping: 27,
  mass: 0.85,
} as const;

/**
 * Smooth glide spring for programmatic horizontal timeline scrolling.
 */
export const TIMELINE_SCROLL_SPRING = {
  type: 'spring',
  stiffness: 180,
  damping: 26,
  mass: 0.9,
} as const;

/**
 * Fast micro-state transition for tab opacity and header swaps.
 */
export const MICRO_FADE_TRANSITION: Transition = {
  duration: 0.16,
  ease: EASE_OUT_EXPO,
};

/**
 * Standard view, collapsible section, and modal content reveal transition.
 */
export const VIEW_TRANSITION: Transition = {
  duration: 0.22,
  ease: EASE_OUT_EXPO,
};

/**
 * Smooth, non-snapping transition for backdrop dimming and blur.
 */
export const UNIFIED_BACKDROP_TRANSITION: Transition = {
  duration: 0.26,
  ease: EASE_OUT_EXPO,
};

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
    opacity: { duration: opacityDuration, delay, ease: EASE_OUT_EXPO },
    default: { ...STARTUP_TEXT_SPRING, delay },
  };
}

/**
 * Decouples crisp opacity easing from tactile spring pop physics for interactive controls and tiles.
 */
export function startupPopTransition(delay = 0, opacityDuration = 0.2): Transition {
  return {
    opacity: { duration: opacityDuration, delay, ease: EASE_OUT_EXPO },
    default: { ...STARTUP_POP_SPRING, delay },
  };
}
