import { AlertTriangle, CheckCircle2, FileSearch } from "lucide-react";
import type { GCCClaimReadiness } from "@/types/gcc-live-insights";

function readinessCopy(readiness: GCCClaimReadiness | null) {
  if (!readiness) {
    return "Claim quality is still being evaluated.";
  }

  if (readiness.summary.trim()) {
    return readiness.summary;
  }

  if (readiness.blockingIssues > 0) {
    return `${readiness.blockingIssues} ${readiness.blockingIssues === 1 ? "issue" : "issues"} may impact claim approval.`;
  }

  if (readiness.warnings > 0) {
    return `${readiness.warnings} ${readiness.warnings === 1 ? "item requires" : "items require"} clinician review.`;
  }

  return "No active documentation issues detected yet.";
}

export default function GCCClaimReadinessCard({ readiness, isAnalyzing = false }: { readiness: GCCClaimReadiness | null; isAnalyzing?: boolean }) {
  const hasBlockingIssues = Boolean(readiness?.blockingIssues);
  const hasWarnings = Boolean(readiness?.warnings);
  const Icon = hasBlockingIssues || hasWarnings ? AlertTriangle : readiness ? CheckCircle2 : FileSearch;

  return (
    <aside
      aria-label="Claim readiness"
      className="relative overflow-hidden rounded-b-[18px] border-t border-indigo-950/20 bg-gradient-to-br from-[#171d3b] via-[#22234b] to-[#30275c] px-4 py-3.5 text-white shadow-[0_-8px_24px_rgba(15,23,42,0.08)]"
    >
      <div className="pointer-events-none absolute -right-8 -top-12 size-28 rounded-full bg-indigo-400/20 blur-2xl" aria-hidden="true" />
      <div className="relative flex items-start gap-3">
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${hasBlockingIssues ? "bg-rose-400/15 text-rose-200" : hasWarnings ? "bg-amber-400/15 text-amber-200" : "bg-emerald-400/15 text-emerald-200"}`}>
          <Icon className="size-[18px]" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-indigo-100">Claim Readiness</h3>
            {isAnalyzing && <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-200"><i className="size-1.5 animate-pulse rounded-full bg-indigo-300" />Analyzing</span>}
          </div>
          <p className="mt-1 text-[13px] font-semibold leading-5 text-white">{readinessCopy(readiness)}</p>
          {readiness && (readiness.blockingIssues > 0 || readiness.warnings > 0) && (
            <div className="mt-2 flex flex-wrap gap-2">
              {readiness.blockingIssues > 0 && (
                <span className="rounded-full bg-rose-400/15 px-2 py-1 text-[10px] font-bold text-rose-100">
                  {readiness.blockingIssues} blocking
                </span>
              )}
              {readiness.warnings > 0 && (
                <span className="rounded-full bg-amber-400/15 px-2 py-1 text-[10px] font-bold text-amber-100">
                  {readiness.warnings} {readiness.warnings === 1 ? "warning" : "warnings"}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
