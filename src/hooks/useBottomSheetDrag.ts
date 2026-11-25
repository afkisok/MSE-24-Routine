import React, { useState, useRef, useCallback } from 'react';

interface UseBottomSheetDragOptions {
  isVisible: boolean;
  onDismiss: () => void;
  dismissThreshold?: number;
  velocityThreshold?: number;
}

interface UseBottomSheetDragReturn {
  dragY: number;
  isDragging: boolean;
  dismissedByDrag: boolean;
  backdropStyle: React.CSSProperties;
  sheetStyle: React.CSSProperties;
  dragHandleProps: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    onTouchCancel: (e: React.TouchEvent) => void;
  };
}

/**
 * Shared touch drag-to-dismiss physics for bottom sheet modals.
 * - Tracks 1:1 finger movement while dragging downward (deltaY > 0) with transition: none
 * - Proportionally fades backdrop opacity
 * - Dismisses smoothly off-screen if dragged > 90px or flicked downward quickly
 * - Springs back to translateY(0) otherwise
 */
export function useBottomSheetDrag({
  isVisible,
  onDismiss,
  dismissThreshold = 90,
  velocityThreshold = 0.55,
}: UseBottomSheetDragOptions): UseBottomSheetDragReturn {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dismissedByDrag, setDismissedByDrag] = useState(false);

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
      // Light smoothing on downward flick velocity
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
      setDismissedByDrag(true);
      onDismiss();
    } else {
      dragYRef.current = 0;
      setDragY(0);
    }
  }, [dismissThreshold, velocityThreshold, onDismiss]);

  // Compute proportional backdrop opacity while dragging
  const dragProgress = Math.min(1, dragY / 280);
  const backdropStyle: React.CSSProperties = isDragging
    ? {
        opacity: Math.max(0.12, 1 - dragProgress * 0.88),
        transition: 'none',
        overscrollBehaviorY: 'contain',
      }
    : {
        overscrollBehaviorY: 'contain',
      };

  // Sheet transform & transition:
  // - 1:1 tracking with transition: none while dragging
  // - Symmetric 200ms ease-out slide-up on open (100% -> 0px) and slide-down on close (0px -> 100%)
  const sheetStyle: React.CSSProperties = isDragging
    ? {
        transform: `translateY(${dragY}px)`,
        transition: 'none',
        overscrollBehaviorY: 'contain',
      }
    : isVisible && !dismissedByDrag
    ? {
        transform: 'translateY(0px)',
        transition: 'transform 200ms cubic-bezier(0, 0, 0.2, 1)',
        overscrollBehaviorY: 'contain',
      }
    : {
        transform: 'translateY(100%)',
        transition: 'transform 200ms cubic-bezier(0, 0, 0.2, 1)',
        overscrollBehaviorY: 'contain',
      };

  return {
    dragY,
    isDragging,
    dismissedByDrag,
    backdropStyle,
    sheetStyle,
    dragHandleProps: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: finishDrag,
      onTouchCancel: finishDrag,
    },
  };
}
