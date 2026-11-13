"use client";

import { useRef } from "react";
import type { TouchEvent } from "react";

/** Handler sentuh: tarik ke bawah lebih dari `threshold` px memanggil `onSwipe`. */
export function useSwipeDown(onSwipe: () => void, threshold = 80) {
  const startY = useRef(0);

  return {
    onTouchStart: (e: TouchEvent<HTMLElement>) => {
      startY.current = e.touches[0].clientY;
    },
    onTouchEnd: (e: TouchEvent<HTMLElement>) => {
      if (e.changedTouches[0].clientY - startY.current > threshold) onSwipe();
    },
  };
}
