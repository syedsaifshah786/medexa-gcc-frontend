import type { GCCLiveSuggestion } from "@/types/gcc-live-insights";

export function suggestionMatchesIds(
  suggestion: GCCLiveSuggestion,
  ids: ReadonlySet<string>,
) {
  return ids.has(suggestion.fingerprint) || ids.has(suggestion.id);
}

export function withLiveSuggestionStatuses(
  suggestions: readonly GCCLiveSuggestion[],
  approvedIds: ReadonlySet<string>,
  ignoredIds: ReadonlySet<string>,
) {
  return suggestions.map((suggestion) => {
    if (suggestion.status === "approved" || suggestion.status === "ignored") return suggestion;
    if (suggestionMatchesIds(suggestion, approvedIds)) return { ...suggestion, status: "approved" as const };
    if (suggestionMatchesIds(suggestion, ignoredIds)) return { ...suggestion, status: "ignored" as const };
    return suggestion;
  });
}

export function upsertLiveSuggestions(
  currentSuggestions: readonly GCCLiveSuggestion[],
  incomingSuggestions: readonly GCCLiveSuggestion[],
  approvedIds: ReadonlySet<string> = new Set(),
  ignoredIds: ReadonlySet<string> = new Set(),
) {
  const suggestions = new Map(
    currentSuggestions.map((suggestion) => [suggestion.fingerprint, suggestion]),
  );
  incomingSuggestions.forEach((incoming) => {
    if (incoming.status === "resolved") {
      suggestions.delete(incoming.fingerprint);
      return;
    }
    const existing = suggestions.get(incoming.fingerprint);
    if (
      existing?.status === "approved" || existing?.status === "ignored"
      || suggestionMatchesIds(incoming, approvedIds)
      || suggestionMatchesIds(incoming, ignoredIds)
    ) return;
    suggestions.set(incoming.fingerprint, {
      ...existing,
      ...incoming,
      id: existing?.id ?? incoming.id,
      createdAt: existing?.createdAt ?? incoming.createdAt,
      status: "active",
    });
  });
  return [...suggestions.values()];
}

export function activeLiveSuggestions(suggestions: readonly GCCLiveSuggestion[]) {
  return suggestions.filter((suggestion) => suggestion.status === "active");
}
