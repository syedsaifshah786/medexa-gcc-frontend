"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useGCCLocale } from "@/hooks/useGCCLocale";
import { countMeaningfulSoapFields } from "@/lib/review/map-review-bundle-response";
import { resolveReviewBundleForSession } from "@/lib/review/resolve-review-bundle";
import { useGCCReviewContext } from "@/providers/GCCReviewProvider";
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
  const reviewContext = useGCCReviewContext();
  const sessionId = searchParams.get("sessionId");
  const [status, setStatus] = useState<ReviewDataStatus>("idle");
  const [bundle, setBundle] = useState<GCCReviewBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const refresh = useCallback(() => {
    setRefreshNonce((value) => value + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

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

    const cachedFromStorage = readReviewBundleFromCache(sessionId, locale);
    const resolved = resolveReviewBundleForSession(sessionId, locale, reviewContext.bundle, cachedFromStorage);
    const providerBundle = resolved.source === "provider" ? resolved.bundle : null;
    const cachedBundle = resolved.bundle;
    queueMicrotask(() => {
      if (!isMounted) return;
      if (cachedBundle) {
        setBundle(cachedBundle);
        if (!providerBundle) reviewContext.setReviewBundle(cachedBundle, "cache");
        setStatus("ready");
        setError(null);
      } else {
        setBundle(null);
        setStatus("loading");
        setError(null);
      }
    });

    if (cachedBundle) {
      if (process.env.NODE_ENV === "development") {
        console.debug("[GCC review] bundle loaded", {
          sessionIdMatches: cachedBundle.sessionId === sessionId,
          soapLoaderSource: resolved.source,
          mappedSoapFieldCount: countMeaningfulSoapFields(cachedBundle.soapNote),
        });
      }
      return () => {
        isMounted = false;
      };
    }

    const loadBundle = async () => {
      try {
        const remoteBundle = await fetchGCCReviewBundle(sessionId, locale);
        if (!isMounted) return;

        if (remoteBundle) {
          setBundle(remoteBundle);
          saveReviewBundleLocally(remoteBundle, locale);
          reviewContext.setReviewBundle(remoteBundle, "backend");
          setStatus("ready");
          setError(null);
          return;
        }

        if (!cachedBundle) {
          setBundle(null);
          setStatus("error");
          setError(t("review.error.notFound"));
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
  }, [locale, refreshNonce, reviewContext, sessionId, t]);

  const currentBundle =
    bundle?.sessionId === sessionId && bundle.locale === locale ? bundle : null;
  const mappedBundle = useMemo(() => applyBundle(currentBundle), [currentBundle]);
  const currentStatus = !sessionId
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
    error,
    refresh,
  };
}
