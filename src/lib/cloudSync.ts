export interface CloudCheckpoint {
  revision: number;
  localRevision: number;
  savedAt: string;
}

// A remote revision is accepted only when local edits cannot be overwritten.
export function reconcileCloud(
  localRevision: number,
  checkpoint: CloudCheckpoint | undefined,
  remoteRevision: number | null,
): "upload" | "download" | "conflict" {
  if (remoteRevision === null) return checkpoint ? "conflict" : "upload";
  if (checkpoint?.revision === remoteRevision) return "upload";
  if (checkpoint && checkpoint.localRevision === localRevision) return "download";
  return localRevision === 0 && !checkpoint ? "download" : "conflict";
}

export function cloudError(error: { message?: string; code?: string }): string {
  if (["PGRST205", "PGRST202", "42P01"].includes(error.code || ""))
    return "Cloud storage needs setup. Run supabase/schema.sql in your Supabase SQL Editor, then retry.";
  return error.message || "Cloud saving failed. Your changes are still on this device.";
}
