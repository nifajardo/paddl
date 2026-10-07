"use client";
import { useState } from "react";
import { Cloud, Download, HardDrive, RotateCcw } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { businessDate, downloadFile } from "@/lib/commerce";
export function BackupPanel() {
  const {
    exportDataJson,
    syncCloud,
    restoreCloud,
    sessionUser,
    isSyncing,
    syncError,
    lastSyncedAt,
    signInWithEmail,
  } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  return (
    <section className="m-4 sm:m-6 mb-0 panel p-5 space-y-4 shrink-0">
      <div className="flex gap-3">
        <span className="metric-icon green">
          <HardDrive size={20} />
        </span>
        <div>
          <h2 className="font-bold">Your data, within reach</h2>
          <p className="text-sm text-slate-500">
            Sales and changes save on this device. Keep a backup before clearing
            browser data.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          className="secondary-button"
          onClick={() =>
            downloadFile(
              "paddl-backup-" + businessDate() + ".json",
              exportDataJson(),
            )
          }
        >
          <Download size={16} /> Download backup
        </button>
        <button
          className="secondary-button"
          disabled={isSyncing}
          onClick={syncCloud}
        >
          <Cloud size={16} />
          {isSyncing ? "Backing up…" : "Save cloud backup"}
        </button>
        {sessionUser && (
          <button className="secondary-button" onClick={() => setConfirm(true)}>
            <RotateCcw size={16} /> Restore cloud backup
          </button>
        )}
      </div>
      {lastSyncedAt && (
        <p className="text-xs text-emerald-700">
          Last successful cloud backup:{" "}
          {new Date(lastSyncedAt).toLocaleString("en-PH")}
        </p>
      )}
      {syncError && (
        <p
          role="alert"
          className="text-sm text-amber-800 bg-amber-50 p-3 rounded-lg"
        >
          {syncError}
        </p>
      )}
      {!sessionUser && (
        <form
          className="flex flex-wrap gap-2 items-end"
          onSubmit={async (e) => {
            e.preventDefault();
            const result = await signInWithEmail(email, password);
            setError(result.error || "");
            if (!result.error) setPassword("");
          }}
        >
          <label className="field-label flex-1 min-w-40">
            Cloud account email
            <input
              className="field-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </label>
          <label className="field-label flex-1 min-w-40">
            Password
            <input
              className="field-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          <button className="secondary-button">Connect account</button>
          {error && <p className="w-full text-red-600 text-sm">{error}</p>}
        </form>
      )}
      {confirm && (
        <div className="p-4 bg-amber-50 rounded-xl text-sm">
          <p>
            Restore the cloud version of this industry workspace? A recovery
            copy of the current workspace will be kept on this device.
          </p>
          <div className="flex gap-3 mt-3">
            <button
              className="primary-button"
              onClick={async () => {
                await restoreCloud();
                setConfirm(false);
              }}
            >
              Restore backup
            </button>
            <button
              className="secondary-button"
              onClick={() => setConfirm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
