"use client";

import { useEffect, useState } from "react";

export function useDebounced<T>(value: T, ms = 300): T {
  const [tertunda, setTertunda] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setTertunda(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return tertunda;
}
