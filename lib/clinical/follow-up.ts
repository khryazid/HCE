export type FollowUpTimelineFilter = "completados" | "pendientes" | "vencidos";

export function getNextFollowUpDate(specialtyData: Record<string, unknown>) {
  const value = specialtyData.next_follow_up_date;

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function isFollowUpOverdue(nextFollowUpDate: string | null, referenceTime = Date.now()) {
  if (!nextFollowUpDate) {
    return false;
  }

  const dueDate = new Date(nextFollowUpDate);
  if (Number.isNaN(dueDate.getTime())) {
    return false;
  }

  return dueDate.getTime() < referenceTime;
}

export function getFollowUpTimelineState(
  specialtyData: Record<string, unknown>,
  referenceTime = Date.now(),
): FollowUpTimelineFilter | null {
  const nextFollowUpDate = getNextFollowUpDate(specialtyData);

  if (nextFollowUpDate) {
    return isFollowUpOverdue(nextFollowUpDate, referenceTime) ? "vencidos" : "pendientes";
  }

  if (specialtyData.follow_up_mode === "seguimiento") {
    return "completados";
  }

  return null;
}

export function countRecordsWithFollowUpDate(records: Array<{ specialty_data: Record<string, unknown> }>) {
  return records.filter((record) => Boolean(getNextFollowUpDate(record.specialty_data))).length;
}