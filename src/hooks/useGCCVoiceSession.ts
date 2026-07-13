"use client";

import { useGCCVoiceSessionContext } from "@/providers/GCCVoiceSessionProvider";

export function useGCCVoiceSession() {
  return useGCCVoiceSessionContext();
}
