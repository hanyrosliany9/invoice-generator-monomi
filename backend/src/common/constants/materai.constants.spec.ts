import { isMateraiRequired, MATERAI_THRESHOLD } from "./materai.constants";
import { TransformationUtil } from "../utils/transformation.util";

describe("materai threshold (UU 10/2020: strictly more than Rp 5.000.000)", () => {
  it("threshold is 5,000,000", () => {
    expect(MATERAI_THRESHOLD).toBe(5_000_000);
  });

  it("does not require materai below or exactly at 5,000,000", () => {
    expect(isMateraiRequired(4_999_999)).toBe(false);
    expect(isMateraiRequired(5_000_000)).toBe(false);
  });

  it("requires materai above 5,000,000", () => {
    expect(isMateraiRequired(5_000_001)).toBe(true);
  });

  it("TransformationUtil.requiresMaterai agrees at the boundary", () => {
    expect(TransformationUtil.requiresMaterai(5_000_000)).toBe(false);
    expect(TransformationUtil.requiresMaterai(5_000_001)).toBe(true);
  });
});
