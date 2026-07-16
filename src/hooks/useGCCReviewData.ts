"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GCC_REVIEW_DEMO_MODE } from "@/config/gcc-demo-mode";
import {
  createGCCDemoReviewBundle,
  saveGCCDemoReviewBundleLocally,
} from "@/data/gcc-demo-review-bundle";
import { useGCCLocale } from "@/hooks/useGCCLocale";
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
  const { locale, t } = useGCCLocale();
  const sessionId = searchParams.get("sessionId");
  const [status, setStatus] = useState<ReviewDataStatus>("idle");
  const [bundle, setBundle] = useState<GCCReviewBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const refresh = useCallback(() => {
    setRefreshNonce((value) => value + 1);
  }, []);

  const demoBundle = useMemo(
    () => createGCCDemoReviewBundle({
      sessionId: sessionId ?? "gcc-demo-review",
      locale,
      transcript: bundle?.sessionId === sessionId ? bundle.transcript : "",
      elapsedMs: bundle?.sessionId === sessionId ? bundle.elapsedMs : 0,
    }),
    [bundle, locale, sessionId],
  );

  useEffect(() => {
    let isMounted = true;

    if (GCC_REVIEW_DEMO_MODE) {
      if (sessionId) {
        const cachedBundle = readReviewBundleFromCache(sessionId, locale);
        const visibleBundle = createGCCDemoReviewBundle({
          sessionId,
          locale,
          transcript: cachedBundle?.transcript ?? "",
          elapsedMs: cachedBundle?.elapsedMs ?? 0,
        });
        saveGCCDemoReviewBundleLocally({
          sessionId,
          locale,
          transcript: visibleBundle.transcript,
          elapsedMs: visibleBundle.elapsedMs,
        });
        queueMicrotask(() => {
          if (!isMounted) return;
          setBundle(visibleBundle);
          setStatus("ready");
          setError(null);
        });
      }
      return () => {
        isMounted = false;
      };
    }

    if (!sessionId) {
      queueMicrotask(() => {
        if (!isMounted) return;
        setBundle(null);
        setError(null);
        setStatus("waiting-for-session");
      });
      return () => {
        isMounted = false;
      };
    }

    const cachedBundle = readReviewBundleFromCache(sessionId, locale);
    queueMicrotask(() => {
      if (!isMounted) return;
      if (cachedBundle) {
        setBundle(cachedBundle);
        setStatus("ready");
        setError(null);
      } else {
        setBundle(null);
        setStatus("loading");
        setError(null);
      }
    });

    const loadBundle = async () => {
      try {
        const remoteBundle = await fetchGCCReviewBundle(sessionId, locale);
        if (!isMounted) return;

        if (remoteBundle) {
          setBundle(remoteBundle);
          saveReviewBundleLocally(remoteBundle, locale);
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
        setError(cachedBundle ? null : t("review.error.load"));
      }
    };

    void loadBundle();
    return () => {
      isMounted = false;
    };
  }, [locale, refreshNonce, sessionId, t]);

  const currentBundle =
    bundle?.sessionId === sessionId && bundle.locale === locale ? bundle : null;
  const displayedBundle = GCC_REVIEW_DEMO_MODE ? demoBundle : currentBundle;
  const mappedBundle = useMemo(() => applyBundle(displayedBundle), [displayedBundle]);
  const currentStatus = GCC_REVIEW_DEMO_MODE
    ? "ready"
    : !sessionId
    ? "waiting-for-session"
    : status === "ready" && !currentBundle
      ? "loading"
      : status;

  return {
    sessionId,
    status: currentStatus,
    soapNote: mappedBundle.soapNote,
    billingIntelligence: mappedBundle.billingIntelligence,
    patientSummary: mappedBundle.patientSummary,
    transcript: mappedBundle.transcript,
    elapsedMs: mappedBundle.elapsedMs,
    error: GCC_REVIEW_DEMO_MODE ? null : error,
    refresh,
  };
}
