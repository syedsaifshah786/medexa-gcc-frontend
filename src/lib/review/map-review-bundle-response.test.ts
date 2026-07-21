import { describe, expect, it } from "vitest";
import { countMeaningfulSoapFields, mapReviewBundleResponse } from "@/lib/review/map-review-bundle-response";
import { rawFinalizeResponse } from "@/lib/review/review-test-fixture";

describe("mapReviewBundleResponse", () => {
  it("maps the finalization snake_case contract into one canonical bundle", () => {
    const mapped = mapReviewBundleResponse(rawFinalizeResponse);

    expect(mapped.sessionId).toBe("session-review-1");
    expect(mapped.reviewBundle.soapNote.subjective.chiefComplaint).toBe("Lower back pain");
    expect(mapped.reviewBundle.soapNote.assessment.summary).toBe("Walking is limited.");
    expect(mapped.reviewBundle.soapNote.plan.recommendations).toEqual(["Continue gentle exercises"]);
    expect(mapped.reviewBundle.billingIntelligence.items).toEqual([]);
    expect(mapped.reviewBundle.patientSummary.focusAreas).toEqual(["Walking"]);
    expect(countMeaningfulSoapFields(mapped.reviewBundle.soapNote)).toBeGreaterThan(0);
  });

  it("preserves partial meaningful SOAP data without inventing missing fields", () => {
    const partial = structuredClone(rawFinalizeResponse);
    partial.review_bundle.soap_note.subjective = { chief_complaint: "Lower back pain" } as typeof partial.review_bundle.soap_note.subjective;
    partial.review_bundle.soap_note.assessment = {} as typeof partial.review_bundle.soap_note.assessment;
    partial.review_bundle.soap_note.plan = {} as typeof partial.review_bundle.soap_note.plan;
    const mapped = mapReviewBundleResponse(partial);

    expect(mapped.reviewBundle.soapNote.subjective.chiefComplaint).toBe("Lower back pain");
    expect(mapped.reviewBundle.soapNote.objective.observations).toEqual([]);
    expect(mapped.reviewBundle.soapNote.assessment.summary).toBeNull();
  });

  it("rejects a completed response whose SOAP object is empty", () => {
    const empty = structuredClone(rawFinalizeResponse);
    empty.review_bundle.soap_note = {
      subjective: {}, objective: {}, assessment: {}, plan: {}, clinician_review_required: true,
    } as typeof empty.review_bundle.soap_note;

    expect(() => mapReviewBundleResponse(empty)).toThrow("empty");
  });

  it("gives SOAP, Billing, and Patient Summary the same canonical bundle", () => {
    const bundle = mapReviewBundleResponse(rawFinalizeResponse).reviewBundle;
    expect(bundle.soapNote).toBeTruthy();
    expect(bundle.billingIntelligence).toBeTruthy();
    expect(bundle.patientSummary).toBeTruthy();
    expect(bundle.sessionId).toBe("session-review-1");
  });
});
