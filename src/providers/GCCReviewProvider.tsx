"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { GCCReviewBundle } from "@/types/gcc-review";

type ReviewSource = "finalize" | "cache" | "backend" | null;

type GCCReviewContextValue = {
  bundle: GCCReviewBundle | null;
  source: ReviewSource;
  setReviewBundle: (bundle: GCCReviewBundle, source: Exclude<ReviewSource, null>) => void;
};

const GCCReviewContext = createContext<GCCReviewContextValue | null>(null);

export function GCCReviewProvider({ children }: { children: ReactNode }) {
  const [bundle, setBundle] = useState<GCCReviewBundle | null>(null);
  const [source, setSource] = useState<ReviewSource>(null);
  const setReviewBundle = useCallback((nextBundle: GCCReviewBundle, nextSource: Exclude<ReviewSource, null>) => {
    setBundle(nextBundle);
    setSource(nextSource);
  }, []);
  const value = useMemo(() => ({ bundle, source, setReviewBundle }), [bundle, setReviewBundle, source]);
  return <GCCReviewContext.Provider value={value}>{children}</GCCReviewContext.Provider>;
}

export function useGCCReviewContext() {
  const context = useContext(GCCReviewContext);
  if (!context) throw new Error("useGCCReviewContext must be used within GCCReviewProvider");
  return context;
}
