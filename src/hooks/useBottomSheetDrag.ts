import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { TargetAndTransition, Transition } from 'motion/react';

interface UseBottomSheetDragOptions {
  isClosing: boolean;
  onDismiss: () => void;
  dismissThreshold?: number;
  velocityThreshold?: number;
}

export type SheetMotionPose = TargetAndTransition;

interface UseBottomSheetDragReturn {
  dragY: number;
  isDragging: boolean;
  dismissedByDrag: boolean;
  isDesktop: boolean;
  backdropAnimate: TargetAndTransition;
  backdropTransition: Transition;
  sheetInitial: SheetMotionPose;
  sheetAnimate: SheetMotionPose;
  sheetTransition: Transition;
  dragHandleProps: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    onTouchCancel: (e: React.TouchEvent) => void;
  };
}

export const MODAL_OPEN_SPRING: Transition = {
  type: 'spring',
  stiffness: 360,
  damping: 26,
  mass: 0.86,
};

export const MODAL_SNAPBACK_SPRING: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 28,
  mass: 0.85,
};

export const MODAL_CLOSE_SPRING: Transition = {
  type: 'spring',
  stiffness: 460,
  damping: 34,
  mass: 0.78,
};

/**
 * Shared spring-physics open/close and touch drag-to-dismiss hook for expanded modals.
 * - Mobile (< 640px): bottom sheet springs up from below the viewport and springs down on dismiss.
 * - Desktop (>= 640px): centered modal springs cleanly into place with subtle scale & vertical lift.
 * - Dragging downward tracks 1:1 with zero transition lag, forwards flick velocity on dismiss,
 *   or springs smoothly back to rest if released below threshold.
 */
export function useBottomSheetDrag({
  isClosing,
  onDismiss,
  dismissThreshold = 90,
  velocityThreshold = 0.55,
}: UseBottomSheetDragOptions): UseBottomSheetDragReturn {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dismissedByDrag, setDismissedByDrag] = useState(false);
  const [releaseVelocityPxPerSec, setReleaseVelocityPxPerSec] = useState(0);
  const [hasSnappedBack, setHasSnappedBack] = useState(false);

  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia('(min-width: 640px)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(min-width: 640px)');
    const handleChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    setIsDesktop(mql.matches);
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  const startXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);
  const lastYRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const velocityYRef = useRef<number>(0);
  const dragYRef = useRef<number>(0);
  const activeGestureRef = useRef<'undecided' | 'vertical' | 'ignored'>('ignored');

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    lastYRef.current = touch.clientY;
    lastTimeRef.current = performance.now();
    velocityYRef.current = 0;
    dragYRef.current = 0;
    activeGestureRef.current = 'undecided';
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (activeGestureRef.current === 'ignored' || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - startXRef.current;
    const deltaY = touch.clientY - startYRef.current;

    if (activeGestureRef.current === 'undecided') {
      if (Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
        activeGestureRef.current = 'ignored';
        return;
      }
      if (deltaY > 4) {
        activeGestureRef.current = 'vertical';
        setIsDragging(true);
        setHasSnappedBack(false);
      } else if (deltaY < -6) {
        activeGestureRef.current = 'ignored';
        return;
      } else {
        return;
      }
    }

    if (activeGestureRef.current === 'vertical') {
      // Prevent browser pull-to-refresh while dragging the sheet
      if (e.cancelable) {
        e.preventDefault();
      }
      const clampedY = Math.max(0, deltaY);
      const now = performance.now();
      const dt = Math.max(1, now - lastTimeRef.current);
      const instantVelocity = (touch.clientY - lastYRef.current) / dt;
      // Light smoothing on downward flick velocity (px/ms)
      velocityYRef.current = velocityYRef.current * 0.4 + instantVelocity * 0.6;
      lastYRef.current = touch.clientY;
      lastTimeRef.current = now;
      dragYRef.current = clampedY;
      setDragY(clampedY);
    }
  }, []);

  const finishDrag = useCallback(() => {
    if (activeGestureRef.current !== 'vertical') {
      activeGestureRef.current = 'ignored';
      return;
    }

    const currentY = dragYRef.current;
    const velocity = velocityYRef.current;
    activeGestureRef.current = 'ignored';

    const shouldDismiss =
      currentY > dismissThreshold || (currentY > 24 && velocity > velocityThreshold);

    setIsDragging(false);

    if (shouldDismiss) {
      setReleaseVelocityPxPerSec(Math.max(0, velocity * 1000));
      setDismissedByDrag(true);
      onDismiss();
    } else {
      dragYRef.current = 0;
      setDragY(0);
      setHasSnappedBack(true);
    }
  }, [dismissThreshold, velocityThreshold, onDismiss]);

  const isClosed = isClosing || dismissedByDrag;
  const dragProgress = Math.min(1, dragY / 280);

  const backdropAnimate = {
    opacity: isDragging ? Math.max(0.12, 1 - dragProgress * 0.88) : isClosed ? 0 : 1,
  };

  const backdropTransition: Transition = isDragging
    ? { duration: 0 }
    : { duration: isClosed ? 0.2 : 0.24, ease: [0.22, 1, 0.36, 1] };

  const closedPose: SheetMotionPose = isDesktop
    ? { y: 28, scale: 0.94, opacity: 0 }
    : { y: '104%', scale: 0.985, opacity: 1 };

  const openPose: SheetMotionPose = { y: 0, scale: 1, opacity: 1 };

  const sheetAnimate: SheetMotionPose = isDragging
    ? { y: dragY, scale: 1, opacity: 1 }
    : isClosed
    ? closedPose
    : openPose;

  const sheetTransition: Transition = isDragging
    ? { duration: 0 }
    : isClosed
    ? {
        ...MODAL_CLOSE_SPRING,
        ...(dismissedByDrag && releaseVelocityPxPerSec > 0
          ? { velocity: releaseVelocityPxPerSec }
          : {}),
      }
    : hasSnappedBack
    ? MODAL_SNAPBACK_SPRING
    : MODAL_OPEN_SPRING;

  return {
    dragY,
    isDragging,
    dismissedByDrag,
    isDesktop,
    backdropAnimate,
    backdropTransition,
    sheetInitial: closedPose,
    sheetAnimate,
    sheetTransition,
    dragHandleProps: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: finishDrag,
      onTouchCancel: finishDrag,
    },
  };
}
