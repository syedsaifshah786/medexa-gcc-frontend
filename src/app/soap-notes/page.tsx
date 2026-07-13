import GCCReviewCarousel from "@/components/review/GCCReviewCarousel";

export default async function GCCSoapNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ sessionId?: string | string[] }>;
}) {
  const params = await searchParams;
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;
  return <GCCReviewCarousel initialStep={0} sessionId={sessionId ?? null} />;
}
