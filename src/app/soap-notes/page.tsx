import { Suspense } from "react";
import GCCReviewCarousel from "@/components/review/GCCReviewCarousel";

export default function GCCSoapNotesPage() {
  return (
    <Suspense fallback={null}>
      <GCCReviewCarousel initialStep={0} />
    </Suspense>
  );
}
