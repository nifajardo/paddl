import type { Transaction } from "../types/index";

export type ReportPeriod =
  | "TODAY"
  | "YESTERDAY"
  | "THIS_WEEK"
  | "LAST_WEEK"
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "THIS_YEAR"
  | "CUSTOM"
  | "ALL_TIME";

// All business reporting uses the Philippine calendar, including date-only expenses.
export function reportDay(value: string | Date) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
    return value;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function reportRange(
  period: ReportPeriod,
  start = "",
  end = "",
  exact = "",
  now = new Date(),
) {
  const today = reportDay(now);
  const calendar = new Date(`${today}T00:00:00Z`);
  const shift = (days: number) =>
    new Date(calendar.getTime() + days * 86400000).toISOString().slice(0, 10);
  if (exact) return { start: exact, end: exact, label: exact };
  let from = "",
    to = today;
  const mondayOffset = -((calendar.getUTCDay() + 6) % 7);
  switch (period) {
    case "TODAY":
      from = today;
      break;
    case "YESTERDAY":
      from = to = shift(-1);
      break;
    case "THIS_WEEK":
      from = shift(mondayOffset);
      break;
    case "LAST_WEEK":
      from = shift(mondayOffset - 7);
      to = shift(mondayOffset - 1);
      break;
    case "THIS_MONTH":
      from = today.slice(0, 7) + "-01";
      break;
    case "LAST_MONTH": {
      const month = new Date(
        Date.UTC(calendar.getUTCFullYear(), calendar.getUTCMonth(), 1),
      );
      to = new Date(month.getTime() - 86400000).toISOString().slice(0, 10);
      from = to.slice(0, 7) + "-01";
      break;
    }
    case "THIS_YEAR":
      from = today.slice(0, 4) + "-01-01";
      break;
    case "CUSTOM":
      from = start;
      to = end;
      break;
    case "ALL_TIME":
      to = "";
      break;
  }
  return {
    start: from,
    end: to,
    label:
      !from && !to
        ? "All time"
        : `${from || "Beginning"} to ${to || "Present"}`,
  };
}

export function inReportRange(
  value: string,
  range: { start: string; end: string },
) {
  const day = reportDay(value);
  return (
    Boolean(day) &&
    (!range.start || day >= range.start) &&
    (!range.end || day <= range.end)
  );
}
