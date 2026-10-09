export function canViewPrintJob(
  job: { mode?: string; ownerId?: string },
  accountId: string | undefined,
  currentMode: string,
): boolean {
  if (job.mode === "PRODUCTION") return !!job.ownerId && job.ownerId === accountId;
  if (job.mode === "DEMO") return true;
  return currentMode === "DEMO" && job.mode === undefined;
}
