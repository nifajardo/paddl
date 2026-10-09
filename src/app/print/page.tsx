"use client";
import { useEffect, useRef, useState } from "react";
import { PRINT_LAYOUT_FIXES } from "@/lib/printLayout";
import { canViewPrintJob } from "@/lib/printAccess";
import { useStore } from "@/context/StoreContext";
import Link from "next/link";

interface PrintJob {
  title: string;
  html: string;
  createdAt: number;
  mode?: string;
  ownerId?: string;
}
export default function PrintPreview() {
  const { sessionUser, isSessionLoading, mounted, appMode } = useStore();
  const accountId = sessionUser?.id;
  const frame = useRef<HTMLIFrameElement>(null);
  const [job, setJob] = useState<PrintJob | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!mounted || isSessionLoading) return;
    try {
      const id = new URLSearchParams(window.location.search).get("job");
      if (!id || !/^[0-9a-f-]{36}$/i.test(id))
        throw new Error("Open a document from a Paddl print button.");
      const saved = JSON.parse(
        localStorage.getItem("PADDL_PRINT_" + id) || "null",
      );
      if (
        !saved ||
        typeof saved.html !== "string" ||
        typeof saved.title !== "string" ||
        !Number.isFinite(saved.createdAt) ||
        Date.now() - saved.createdAt > 86400000
      )
        throw new Error(
          "This preview has expired. Reopen the document in Paddl and print again.",
        );
      if (!canViewPrintJob(saved, accountId, appMode))
        throw new Error("Sign in to the business account that created this preview, or reopen the document from your workspace.");
      document.title = saved.title;
      // Synchronize the selected external print snapshot after account initialization.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setJob(saved);
      setError("");
    } catch (e) {
      document.title = "Paddl print preview";
      setError((e as Error).message);
    }
  }, [mounted, isSessionLoading, accountId, appMode]);
  const authorized = !!job && !isSessionLoading && canViewPrintJob(job, accountId, appMode);
  async function print() {
    const doc = frame.current?.contentDocument;
    const target = frame.current?.contentWindow;
    if (!doc || !target) return;
    await doc.fonts.ready;
    await Promise.all(
      [...doc.images].map((image) =>
        image.complete
          ? Promise.resolve()
          : image.decode().catch(() => undefined),
      ),
    );
    target.focus();
    target.print();
  }
  function documentLoaded() {
    const doc = frame.current?.contentDocument;
    if (!doc) return;
    const style = doc.createElement("style");
    style.textContent = PRINT_LAYOUT_FIXES;
    doc.head.appendChild(style);
    setReady(true);
  }
  return (
    <main className="standalone-print-preview">
      <header>
        <div>
          <strong>{authorized ? job.title : "Print preview"}</strong>
          <p>Review your document, then print or save it as a PDF.</p>
        </div>
        <button disabled={!ready || !authorized} onClick={() => void print()}>
          Print / Save PDF
        </button>
      </header>
      {error ? (
        <div role="alert" className="print-preview-error">
          <h1>Preview unavailable</h1>
          <p>{error}</p>
          <Link href="/">Back to Paddl</Link>
        </div>
      ) : job && authorized ? (
        <iframe
          ref={frame}
          title="Printable document"
          srcDoc={job.html}
          sandbox="allow-same-origin allow-modals"
          onLoad={documentLoaded}
        />
      ) : (
        <p className="p-6">Preparing document…</p>
      )}
    </main>
  );
}
