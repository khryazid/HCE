import { describe, expect, it } from "vitest";
import {
  countRecordsWithFollowUpDate,
  getFollowUpTimelineState,
  getNextFollowUpDate,
  isFollowUpOverdue,
} from "@/lib/clinical/follow-up";

describe("follow up utils", () => {
  const referenceTime = new Date("2026-04-27T12:00:00.000Z").getTime();

  it("normalizes next follow-up dates", () => {
    expect(getNextFollowUpDate({ next_follow_up_date: " 2026-05-01 " })).toBe("2026-05-01");
    expect(getNextFollowUpDate({ next_follow_up_date: "" })).toBeNull();
    expect(getNextFollowUpDate({})).toBeNull();
  });

  it("detects overdue follow-up dates deterministically", () => {
    expect(isFollowUpOverdue("2026-04-26", referenceTime)).toBe(true);
    expect(isFollowUpOverdue("2026-04-28", referenceTime)).toBe(false);
    expect(isFollowUpOverdue(null, referenceTime)).toBe(false);
  });

  it("derives the timeline state from specialty data", () => {
    expect(
      getFollowUpTimelineState({ next_follow_up_date: "2026-04-26" }, referenceTime),
    ).toBe("vencidos");

    expect(
      getFollowUpTimelineState({ next_follow_up_date: "2026-04-28" }, referenceTime),
    ).toBe("pendientes");

    expect(
      getFollowUpTimelineState({ follow_up_mode: "seguimiento" }, referenceTime),
    ).toBe("completados");
  });

  it("counts records that have a valid follow-up date", () => {
    expect(
      countRecordsWithFollowUpDate([
        { specialty_data: { next_follow_up_date: "2026-04-26" } },
        { specialty_data: { next_follow_up_date: "" } },
        { specialty_data: { next_follow_up_date: "2026-04-28" } },
      ]),
    ).toBe(2);
  });
});