"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import GCCBillingReviewCard from "@/components/review/GCCBillingReviewCard";
import GCCPatientSummaryCard from "@/components/review/GCCPatientSummaryCard";
import GCCReviewActions from "@/components/review/GCCReviewActions";
import GCCReviewShell from "@/components/review/GCCReviewShell";
import GCCSoapReviewCard from "@/components/review/GCCSoapReviewCard";
import { fetchGCCSoapNote, getSoapStorageKey, type GCCSoapNote } from "@/lib/gcc/session-api";

type GCCReviewCarouselProps = {
  initialStep: 0 | 1 | 2;
  sessionId?: string | null;
};

type ReviewSlideIndex = 0 | 1 | 2;

const routes = ["/soap-notes", "/billing-intelligence", "/patient-summary"] as const;

const slideMeta = [
  {
    title: "SOAP Notes",
    subtitle: "Validate clinical objects generated from ambient recording.",
    exportMessage: "SOAP Notes export prepared",
  },
  {
    title: "Billing Intelligence",
    subtitle: "Medexa AI has mapped documentation to GCC standard coding systems.",
    exportMessage: "Billing Intelligence export prepared",
  },
  {
    title: "Patient Summary",
    subtitle: "Share this Medexa summary with the patient what we worked on.",
    exportMessage: "Patient Summary export prepared",
  },
] as const;

const interactiveSelector = 'input, textarea, button, a, select, [contenteditable="true"]';
const dragThresholdRatio = 0.22;

export default function GCCReviewCarousel({ initialStep, sessionId = null }: GCCReviewCarouselProps) {
  const router = useRouter();
  const viewportRef = useRef<HTMLDivElement>(null);
  const firstCardRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const dragOffsetRef = useRef(0);
  const routeTimeoutRef = useRef<number | null>(null);
  const previousUserSelectRef = useRef("");
  const [activeIndex, setActiveIndex] = useState(initialStep);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isPointerTracking, setIsPointerTracking] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [toast, setToast] = useState("");
  const [patientCompleted, setPatientCompleted] = useState(false);
  const [soapNote, setSoapNote] = useState<GCCSoapNote | null>(null);
  const [isSoapLoading, setIsSoapLoading] = useState(false);
  const [soapError, setSoapError] = useState<string | null>(null);

  const gap = viewportWidth < 768 ? 18 : 72;
  const stepDistance = cardWidth + gap;
  const currentMeta = slideMeta[activeIndex];
  const cards = useMemo(
    () => [
      <GCCSoapReviewCard key="soap" soapNote={soapNote} isLoading={isSoapLoading} errorMessage={soapError} sessionId={sessionId} />,
      <GCCBillingReviewCard key="billing" />,
      <GCCPatientSummaryCard key="summary" completed={patientCompleted} />,
    ],
    [isSoapLoading, patientCompleted, sessionId, soapError, soapNote],
  );

  useEffect(() => {
    setActiveIndex(initialStep);
  }, [initialStep]);

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
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    if (!sessionId) {
      setSoapNote(null);
      setSoapError(null);
      setIsSoapLoading(false);
      return;
    }

    let isMounted = true;
    const loadSoapNote = async () => {
      setIsSoapLoading(true);
      setSoapError(null);
      let hasSoap = false;

      try {
        const cached = localStorage.getItem(getSoapStorageKey(sessionId));
        if (cached) {
          const parsed = JSON.parse(cached) as GCCSoapNote;
          hasSoap = true;
          if (isMounted) setSoapNote(parsed);
        }
      } catch {
        // Ignore malformed local cache and continue to backend fetch.
      }

      try {
        const remoteSoap = await fetchGCCSoapNote(sessionId);
        if (remoteSoap && isMounted) {
          hasSoap = true;
          setSoapNote(remoteSoap);
          localStorage.setItem(getSoapStorageKey(sessionId), JSON.stringify(remoteSoap));
        }
      } catch {
        // Local cache/fallback remains visible when backend is unavailable.
      } finally {
        if (isMounted) {
          setIsSoapLoading(false);
          setSoapError(hasSoap ? null : "Generated SOAP Notes are not available for this session yet.");
        }
      }
    };

    void loadSoapNote();
    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  useEffect(
    () => () => {
      if (routeTimeoutRef.current !== null) {
        window.clearTimeout(routeTimeoutRef.current);
      }
      document.body.style.userSelect = previousUserSelectRef.current;
    },
    [],
  );

  const replaceRoute = useCallback(
    (index: number) => {
      if (routeTimeoutRef.current !== null) {
        window.clearTimeout(routeTimeoutRef.current);
      }

      const delay = reducedMotion ? 0 : 180;
      routeTimeoutRef.current = window.setTimeout(() => {
        router.replace(routes[index], { scroll: false });
      }, delay);
    },
    [reducedMotion, router],
  );

  const goToIndex = useCallback(
    (nextIndex: number) => {
      const clampedIndex = Math.min(routes.length - 1, Math.max(0, nextIndex)) as ReviewSlideIndex;
      if (clampedIndex === activeIndex) return;
      setPatientCompleted(false);
      setActiveIndex(clampedIndex);
      replaceRoute(clampedIndex);
    },
    [activeIndex, replaceRoute],
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
    const dampedDelta =
      (activeIndex === 0 && deltaX > 0) || (activeIndex === routes.length - 1 && deltaX < 0)
        ? deltaX * 0.28
        : deltaX;
    dragOffsetRef.current = dampedDelta;
    setDragOffset(dampedDelta);
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!isPointerTracking || pointerIdRef.current !== event.pointerId) return;

    const threshold = Math.max(80, cardWidth * dragThresholdRatio);
    const finalOffset = dragOffsetRef.current;

    if (isDragging && Math.abs(finalOffset) >= threshold) {
      goToIndex(finalOffset < 0 ? activeIndex + 1 : activeIndex - 1);
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
      goToIndex(activeIndex + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToIndex(activeIndex - 1);
    }
  };

  const handleSend = () => {
    if (activeIndex < routes.length - 1) {
      goToIndex(activeIndex + 1);
      return;
    }

    if (patientCompleted) {
      router.push("/ambient-listening");
      return;
    }

    setPatientCompleted(true);
  };

  const trackOffset = viewportWidth && cardWidth ? viewportWidth / 2 - cardWidth / 2 - activeIndex * stepDistance + dragOffset : 0;
  const transition = isDragging || reducedMotion ? "none" : "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)";

  return (
    <GCCReviewShell title={currentMeta.title} subtitle={currentMeta.subtitle} step={(activeIndex + 1) as 1 | 2 | 3}>
      <section
        ref={viewportRef}
        role="region"
        aria-label="Medexa GCC review card carousel"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className="relative mt-9 w-full overflow-hidden rounded-[34px] outline-none focus-visible:ring-4 focus-visible:ring-[#5B61F6]/20"
        style={{ touchAction: "pan-y" }}
      >
        <div
          className="flex items-start py-3"
          style={{
            gap,
            transform: `translate3d(${trackOffset}px, 0, 0)`,
            transition,
          }}
        >
          {cards.map((card, index) => {
            const distance = index - activeIndex;
            const isActive = index === activeIndex;
            const rotate = viewportWidth < 768 ? Math.sign(distance) * 2 : Math.sign(distance) * 4;
            const scale = isActive ? 1 : viewportWidth < 768 ? 0.96 : 0.92;

            return (
              <div
                key={routes[index]}
                ref={index === 0 ? firstCardRef : undefined}
                aria-current={isActive ? "step" : undefined}
                aria-label={`${slideMeta[index].title} review card`}
                className={`w-[calc(100vw-28px)] flex-none md:w-[690px] lg:w-[720px] ${isActive ? "pointer-events-auto z-30" : "pointer-events-none z-10"}`}
                style={{
                  opacity: isActive ? 1 : 0.45,
                  transform: `scale(${scale}) rotate(${rotate}deg)`,
                  transition: reducedMotion ? "none" : "opacity 420ms cubic-bezier(0.22, 1, 0.36, 1), transform 420ms cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              >
                {card}
              </div>
            );
          })}
        </div>
      </section>

      <GCCReviewActions onExport={() => setToast(currentMeta.exportMessage)} onSend={handleSend} sendLabel={activeIndex === 2 && patientCompleted ? "Done" : "Send"} />
      {toast && <ReviewToast message={toast} />}
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
