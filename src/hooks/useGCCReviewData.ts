"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  fetchGCCReviewBundle,
  readReviewBundleFromCache,
  saveReviewBundleLocally,
  type GCCBillingIntelligence,
  type GCCPatientSummary,
  type GCCReviewBundle,
  type GCCSoapNote,
} from "@/lib/gcc/session-api";

export type ReviewDataStatus = "idle" | "waiting-for-session" | "loading" | "ready" | "error";

type GCCReviewData = {
  sessionId: string | null;
  status: ReviewDataStatus;
  soapNote: GCCSoapNote | null;
  billingIntelligence: GCCBillingIntelligence | null;
  patientSummary: GCCPatientSummary | null;
  transcript: string;
  elapsedMs: number;
  error: string | null;
  refresh: () => void;
};

function applyBundle(bundle: GCCReviewBundle | null) {
  if (!bundle) {
    return {
      soapNote: null,
      billingIntelligence: null,
      patientSummary: null,
      transcript: "",
      elapsedMs: 0,
    };
  }

  return {
    soapNote: bundle.soapNote,
    billingIntelligence: bundle.billingIntelligence,
    patientSummary: bundle.patientSummary,
    transcript: bundle.transcript,
    elapsedMs: bundle.elapsedMs,
  };
}

export function useGCCReviewData(): GCCReviewData {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const [status, setStatus] = useState<ReviewDataStatus>("idle");
  const [bundle, setBundle] = useState<GCCReviewBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const refresh = useCallback(() => {
    setRefreshNonce((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setBundle(null);
      setError(null);
      setStatus("waiting-for-session");
      return;
    }

    let isMounted = true;
    const cachedBundle = readReviewBundleFromCache(sessionId);
    if (cachedBundle) {
      setBundle(cachedBundle);
      setStatus("ready");
      setError(null);
    } else {
      setBundle(null);
      setStatus("loading");
      setError(null);
    }

    const loadBundle = async () => {
      try {
        const remoteBundle = await fetchGCCReviewBundle(sessionId);
        if (!isMounted) return;

        if (remoteBundle) {
          setBundle(remoteBundle);
          saveReviewBundleLocally(remoteBundle);
          setStatus("ready");
          setError(null);
          return;
        }

        if (!cachedBundle) {
          setBundle(null);
          setStatus("waiting-for-session");
          setError(null);
        }
      } catch {
        if (!isMounted) return;
        setStatus(cachedBundle ? "ready" : "error");
        setError(cachedBundle ? null : "Session review data could not be loaded.");
      }
    };

    void loadBundle();
    return () => {
      isMounted = false;
    };
  }, [refreshNonce, sessionId]);

  const mappedBundle = useMemo(() => applyBundle(bundle), [bundle]);

  return {
    sessionId,
    status,
    soapNote: mappedBundle.soapNote,
    billingIntelligence: mappedBundle.billingIntelligence,
    patientSummary: mappedBundle.patientSummary,
    transcript: mappedBundle.transcript,
    elapsedMs: mappedBundle.elapsedMs,
    error,
    refresh,
  };
}
