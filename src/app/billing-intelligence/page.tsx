import { Suspense } from "react";
import GCCReviewCarousel from "@/components/review/GCCReviewCarousel";

export default function GCCBillingIntelligencePage() {
  return (
    <Suspense fallback={null}>
      <GCCReviewCarousel initialStep={1} />
    </Suspense>
  );
}
