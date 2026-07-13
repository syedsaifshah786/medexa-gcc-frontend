import { Suspense } from "react";
import GCCReviewCarousel from "@/components/review/GCCReviewCarousel";

export default function GCCPatientSummaryPage() {
  return (
    <Suspense fallback={null}>
      <GCCReviewCarousel initialStep={2} />
    </Suspense>
  );
}
