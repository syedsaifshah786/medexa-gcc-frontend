import { describe, expect, it } from "vitest";
import { mapReviewBundleResponse } from "@/lib/review/map-review-bundle-response";
import { countRenderedSoapFields, mapSoapToViewModel } from "@/lib/review/map-soap-to-view-model";
import { rawFinalizeResponse } from "@/lib/review/review-test-fixture";

describe("mapSoapToViewModel", () => {
  it("keeps partial data from every available SOAP section", () => {
    const soap = mapReviewBundleResponse(rawFinalizeResponse).reviewBundle.soapNote;
    const viewModel = mapSoapToViewModel(soap);
    expect(viewModel.subjective.chiefComplaint).toBe("Lower back pain");
    expect(viewModel.assessment.summary).toBe("Walking is limited.");
    expect(viewModel.plan.followUp).toBe("Next week");
    expect(countRenderedSoapFields(viewModel)).toBeGreaterThan(0);
  });
});
