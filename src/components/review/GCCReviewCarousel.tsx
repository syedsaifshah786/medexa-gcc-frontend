"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import ReviewSuccessModal from "@/components/gcc/ReviewSuccessModal";
import GCCBillingReviewCard from "@/components/review/GCCBillingReviewCard";
import GCCPatientSummaryCard from "@/components/review/GCCPatientSummaryCard";
import GCCReviewActions from "@/components/review/GCCReviewActions";
import GCCReviewShell from "@/components/review/GCCReviewShell";
import GCCSoapReviewCard from "@/components/review/GCCSoapReviewCard";
import { useGCCLocale } from "@/hooks/useGCCLocale";
import { useGCCReviewData } from "@/hooks/useGCCReviewData";

type GCCReviewCarouselProps = {
  initialStep: 0 | 1 | 2;
};

type ReviewSlideIndex = 0 | 1 | 2;

const routes = ["/soap-notes", "/billing-intelligence", "/patient-summary"] as const;

const slideMetaKeys = [
  {
    title: "review.soap.title",
    subtitle: "review.soap.subtitle",
    exportMessage: "review.toast.soapExportPrepared",
  },
  {
    title: "review.billing.title",
    subtitle: "review.billing.subtitle",
    exportMessage: "review.toast.billingExportPrepared",
  },
  {
    title: "review.summary.title",
    subtitle: "review.summary.subtitle",
    exportMessage: "review.toast.summaryExportPrepared",
  },
] as const;

const interactiveSelector = 'input, textarea, button, a, select, [contenteditable="true"]';
const dragThresholdRatio = 0.22;
const transitionMs = 420;

const getRouteIndex = (pathname: string): ReviewSlideIndex => {
  const index = routes.findIndex((route) => pathname === route || pathname.startsWith(`${route}/`));
  return index === -1 ? 0 : (index as ReviewSlideIndex);
};

export default function GCCReviewCarousel({ initialStep }: GCCReviewCarouselProps) {
  const router = useRouter();
  const { direction, locale, t } = useGCCLocale();
  const {
    sessionId,
    status: reviewStatus,
    soapNote,
    billingIntelligence,
    patientSummary,
    transcript,
    elapsedMs,
    error: reviewError,
    refresh,
  } = useGCCReviewData();
  const viewportRef = useRef<HTMLDivElement>(null);
  const firstCardRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const dragOffsetRef = useRef(0);
  const routeTimeoutRef = useRef<number | null>(null);
  const previousUserSelectRef = useRef("");
  const hasInitializedFromPathRef = useRef(false);
  const activeIndexRef = useRef<ReviewSlideIndex>(initialStep);
  const [activeIndex, setActiveIndex] = useState(initialStep);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isPointerTracking, setIsPointerTracking] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [toastKey, setToastKey] = useState("");
  const [patientCompleted, setPatientCompleted] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const isReviewLoading = reviewStatus === "loading";
  const isReviewReady = reviewStatus === "ready" && Boolean(soapNote && billingIntelligence && patientSummary);
  const cardError = reviewStatus === "error" ? reviewError ?? t("review.error.load") : null;
  const slideMeta = slideMetaKeys.map((meta) => ({
    title: t(meta.title),
    subtitle: t(meta.subtitle),
    exportMessageKey: meta.exportMessage,
  }));

  const gap = viewportWidth < 768 ? 18 : 72;
  const stepDistance = cardWidth + gap;
  const currentMeta = slideMeta[activeIndex];
  const cards = useMemo(
    () => [
      <GCCSoapReviewCard key="soap" soapNote={soapNote} isLoading={isReviewLoading} errorMessage={cardError} onRetry={refresh} />,
      <GCCBillingReviewCard key="billing" billingIntelligence={billingIntelligence} isLoading={isReviewLoading} errorMessage={cardError} onRetry={refresh} />,
      <GCCPatientSummaryCard key="summary" patientSummary={patientSummary} isLoading={isReviewLoading} errorMessage={cardError} onRetry={refresh} completed={patientCompleted} />,
    ],
    [billingIntelligence, cardError, isReviewLoading, patientCompleted, patientSummary, refresh, soapNote],
  );
  const visualCards = useMemo(() => {
    const entries = cards.map((card, semanticIndex) => ({ card, semanticIndex: semanticIndex as ReviewSlideIndex }));
    return direction === "rtl" ? entries.reverse() : entries;
  }, [cards, direction]);
  const activeVisualIndex = direction === "rtl" ? routes.length - 1 - activeIndex : activeIndex;

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    if (hasInitializedFromPathRef.current) return;
    hasInitializedFromPathRef.current = true;
    const routeIndex = getRouteIndex(window.location.pathname);
    activeIndexRef.current = routeIndex;
    setActiveIndex(routeIndex);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateReducedMotion = () => setReducedMotion(mediaQuery.matches);
    updateReducedMotion();
    mediaQuery.addEventListener("change", updateReducedMotion);
    return () => mediaQuery.removeEventListener("change", updateReducedMotion);
  }, []);

  useEffect(() => {
    const updateMeasurements = () => {
      setViewportWidth(viewportRef.current?.clientWidth ?? 0);
      setCardWidth(firstCardRef.current?.clientWidth ?? 0);
    };

    updateMeasurements();
    const resizeObserver = new ResizeObserver(updateMeasurements);
    if (viewportRef.current) resizeObserver.observe(viewportRef.current);
    if (firstCardRef.current) resizeObserver.observe(firstCardRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!toastKey) return;
    const timeoutId = window.setTimeout(() => setToastKey(""), 2400);
    return () => window.clearTimeout(timeoutId);
  }, [toastKey]);

  useEffect(
    () => () => {
      if (routeTimeoutRef.current !== null) {
        window.clearTimeout(routeTimeoutRef.current);
      }
      document.body.style.userSelect = previousUserSelectRef.current;
    },
    [],
  );

  const updateAddressBar = useCallback(
    (index: ReviewSlideIndex) => {
      if (routeTimeoutRef.current !== null) {
        window.clearTimeout(routeTimeoutRef.current);
      }

      const delay = reducedMotion ? 0 : transitionMs;
      routeTimeoutRef.current = window.setTimeout(() => {
        const nextRoute = sessionId ? `${routes[index]}?sessionId=${encodeURIComponent(sessionId)}` : routes[index];
        window.history.replaceState({ ...window.history.state, medexaReviewStep: index }, "", nextRoute);
      }, delay);
    },
    [reducedMotion, sessionId],
  );

  useEffect(() => {
    const handlePopState = () => {
      const routeIndex = getRouteIndex(window.location.pathname);
      if (routeIndex === activeIndexRef.current) return;
      setPatientCompleted(false);
      setIsSuccessModalOpen(false);
      setIsDragging(false);
      setDragOffset(0);
      dragOffsetRef.current = 0;
      activeIndexRef.current = routeIndex;
      setActiveIndex(routeIndex);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const goToIndex = useCallback(
    (nextIndex: number) => {
      const clampedIndex = Math.min(routes.length - 1, Math.max(0, nextIndex)) as ReviewSlideIndex;
      if (clampedIndex === activeIndexRef.current) return;
      setPatientCompleted(false);
      setIsSuccessModalOpen(false);
      setIsDragging(false);
      window.requestAnimationFrame(() => {
        activeIndexRef.current = clampedIndex;
        setActiveIndex(clampedIndex);
        setDragOffset(0);
        dragOffsetRef.current = 0;
      });
      updateAddressBar(clampedIndex);
    },
    [updateAddressBar],
  );

  const endDrag = useCallback(() => {
    setIsPointerTracking(false);
    setIsDragging(false);
    setDragOffset(0);
    dragOffsetRef.current = 0;
    pointerIdRef.current = null;
    document.body.style.userSelect = previousUserSelectRef.current;
  }, []);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target;
    if (target instanceof Element && target.closest(interactiveSelector)) {
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    pointerIdRef.current = event.pointerId;
    startXRef.current = event.clientX;
    startYRef.current = event.clientY;
    dragOffsetRef.current = 0;
    setIsPointerTracking(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isPointerTracking || pointerIdRef.current !== event.pointerId) return;

    const deltaX = event.clientX - startXRef.current;
    const deltaY = event.clientY - startYRef.current;

    if (!isDragging) {
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 6) {
        endDrag();
        return;
      }

      if (Math.abs(deltaX) < 6) {
        return;
      }

      setIsDragging(true);
      previousUserSelectRef.current = document.body.style.userSelect;
      document.body.style.userSelect = "none";
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    event.preventDefault();
    const navigationDelta = direction === "rtl" ? deltaX : -deltaX;
    const isBeyondEdge =
      (activeIndex === 0 && navigationDelta < 0) ||
      (activeIndex === routes.length - 1 && navigationDelta > 0);
    const dampedDelta = isBeyondEdge ? deltaX * 0.28 : deltaX;
    dragOffsetRef.current = dampedDelta;
    setDragOffset(dampedDelta);
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!isPointerTracking || pointerIdRef.current !== event.pointerId) return;

    const threshold = Math.max(80, cardWidth * dragThresholdRatio);
    const finalOffset = dragOffsetRef.current;

    if (isDragging && Math.abs(finalOffset) >= threshold) {
      const navigationDelta = direction === "rtl" ? finalOffset : -finalOffset;
      goToIndex(navigationDelta > 0 ? activeIndex + 1 : activeIndex - 1);
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    endDrag();
  };

  const handlePointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    endDrag();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goToIndex(activeIndex + (direction === "rtl" ? -1 : 1));
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToIndex(activeIndex + (direction === "rtl" ? 1 : -1));
    }
  };

  const handleSend = () => {
    if (!isReviewReady) return;

    if (activeIndex < routes.length - 1) {
      goToIndex(activeIndex + 1);
      return;
    }

    setPatientCompleted(true);
    setIsSuccessModalOpen(true);
  };

  const handleExport = () => {
    if (!isReviewReady) {
      setToastKey("review.toast.noExportData");
      return;
    }

    const payload = {
      sessionId,
      transcript,
      elapsedMs,
      soapNote,
      billingIntelligence,
      patientSummary,
      locale,
      direction,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `medexa-gcc-review-${sessionId}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setToastKey(currentMeta.exportMessageKey);
  };

  const trackOffset = viewportWidth && cardWidth ? viewportWidth / 2 - cardWidth / 2 - activeVisualIndex * stepDistance + dragOffset : 0;
  const transition = isDragging || reducedMotion ? "none" : `transform ${transitionMs}ms cubic-bezier(0.22, 1, 0.36, 1)`;

  return (
    <GCCReviewShell title={currentMeta.title} subtitle={currentMeta.subtitle} step={(activeIndex + 1) as 1 | 2 | 3}>
      <section
        ref={viewportRef}
        role="region"
        aria-label={t("review.carouselAria")}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className="relative mt-9 w-full overflow-hidden rounded-[34px] outline-none focus-visible:ring-4 focus-visible:ring-[#5B61F6]/20"
        style={{ touchAction: "pan-y", contain: "layout paint", cursor: isDragging ? "grabbing" : "grab" }}
      >
        <div
          dir="ltr"
          className="flex items-start py-3"
          style={{
            gap,
            transform: `translate3d(${trackOffset}px, 0, 0)`,
            transition,
            willChange: "transform",
            backfaceVisibility: "hidden",
            transformStyle: "preserve-3d",
          }}
        >
          {visualCards.map(({ card, semanticIndex }, visualIndex) => {
            const distance = visualIndex - activeVisualIndex;
            const isActive = semanticIndex === activeIndex;
            const rotate = viewportWidth < 768 ? Math.sign(distance) * 2 : Math.sign(distance) * 4;
            const scale = isActive ? 1 : viewportWidth < 768 ? 0.96 : 0.92;

            return (
              <div
                key={routes[semanticIndex]}
                ref={visualIndex === 0 ? firstCardRef : undefined}
                dir={direction}
                aria-current={isActive ? "step" : undefined}
                aria-label={t("review.slideAria", { title: slideMeta[semanticIndex].title })}
                aria-hidden={!isActive}
                inert={!isActive}
                className={`w-[calc(100vw-28px)] flex-none md:w-[690px] lg:w-[720px] ${isActive ? "pointer-events-auto z-30" : "pointer-events-none z-10"}`}
                style={{
                  opacity: isActive ? 1 : 0.45,
                  transform: `scale(${scale}) rotate(${rotate}deg)`,
                  transition: reducedMotion ? "none" : `opacity ${transitionMs}ms cubic-bezier(0.22, 1, 0.36, 1), transform ${transitionMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                  willChange: "transform, opacity",
                  backfaceVisibility: "hidden",
                }}
              >
                {card}
              </div>
            );
          })}
        </div>
      </section>

      <GCCReviewActions onExport={handleExport} onSend={handleSend} disabled={!isReviewReady} />
      {toastKey && <ReviewToast message={t(toastKey)} />}
      {isSuccessModalOpen && (
        <ReviewSuccessModal
          sessionId={sessionId}
          onClose={() => setIsSuccessModalOpen(false)}
          onBackHome={() => router.push("/ambient-listening")}
          onSeeDoc={() => {
            setIsSuccessModalOpen(false);
            goToIndex(2);
          }}
        />
      )}
    </GCCReviewShell>
  );
}

function ReviewToast({ message }: { message: string }) {
  return (
    <div role="status" aria-live="polite" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[#D8DDF2] bg-white px-5 py-3 text-[14px] font-semibold text-[#080B3A] shadow-[0_18px_45px_rgba(55,65,130,0.16)]">
      {message}
    </div>
  );
}
