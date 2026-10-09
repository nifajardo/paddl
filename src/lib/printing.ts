import { toast } from "sonner";
import { PRINT_LAYOUT_FIXES } from "./printLayout";

/** Print only the selected document, outside modal portals and application CSS. */
export function printDocument(
  selector: string,
  title: string,
  format: "receipt" | "sheet" = "receipt",
) {
  const source = document.querySelector<HTMLElement>(selector);
  if (!source || !source.textContent?.trim()) {
    toast.error("The print document is not ready. Reopen it and try again.");
    return;
  }
  const doc = document.implementation.createHTMLDocument(title);
  const charset = doc.createElement("meta");
  charset.setAttribute("charset", "utf-8");
  doc.head.appendChild(charset);
  const style = doc.createElement("style");
  style.textContent = `
    * { box-sizing: border-box; }
    body { margin: 0; background: #f1f5f4; color: #111; font-family: Arial, sans-serif; }
    .print-toolbar { padding: 16px; display: flex; align-items: center; gap: 12px; background: white; border-bottom: 1px solid #ddd; }
    .print-toolbar button { padding: 10px 18px; border: 1px solid #ddd; border-radius: 8px; cursor: pointer; background: #087f65; color: white; }
    .print-toolbar span { flex: 1; font-size: 14px; }
    .print-document { background: white; margin: 24px auto; padding: ${format === "receipt" ? "4mm" : "10mm"}; width: ${format === "receipt" ? "80mm" : "min(210mm, 100%)"}; }
    .print-document > * { position: static !important; max-height: none !important; overflow: visible !important; box-shadow: none !important; border: none !important; padding: 0 !important; margin: 0 !important; }
    .print-document .truncate { white-space: normal !important; overflow-wrap: anywhere; min-width: 0; }
    .print-document [style*="display: flex"] { gap: 2mm !important; }
    .print-document [style*="display: flex"] > * { min-width: 0; }
    .print-document [style*="display: flex"] > :last-child { flex-shrink: 0 !important; }
    .print-document svg { max-width: 100%; }
    .print-document table { width: 100%; border-collapse: collapse; }
    .print-document tr, .print-document .page-break-inside-avoid { break-inside: avoid; }
    ${PRINT_LAYOUT_FIXES}
    @page { size: auto; margin: ${format === "receipt" ? "3mm" : "10mm"}; }
    @media print {
      html, body { background: white; margin: 0; padding: 0; height: auto; overflow: visible; }
      .print-toolbar { display: none !important; }
      .print-document { margin: 0; padding: 0; width: ${format === "receipt" ? "74mm" : "100%"}; }
      .print-document [data-print-hide] { display: none !important; }
    }
  `;
  doc.head.appendChild(style);
  const main = doc.createElement("main");
  main.className = "print-document";
  const clone = source.cloneNode(true) as HTMLElement;
  const originals = [source, ...source.querySelectorAll<HTMLElement>("*")];
  const copies = [clone, ...clone.querySelectorAll<HTMLElement>("*")];
  // Freeze the visible document's typography and layout; no app print rules,
  // hidden dialog ancestors, remote stylesheet load, or hydration dependency.
  const properties = [
    "display",
    "font-family",
    "font-size",
    "font-weight",
    "line-height",
    "text-align",
    "color",
    "background-color",
    "border-top",
    "border-bottom",
    "border-left",
    "border-right",
    "border-radius",
    "padding",
    "margin",
    "gap",
    "flex-direction",
    "flex-wrap",
    "flex-grow",
    "flex-shrink",
    "flex-basis",
    "align-items",
    "justify-content",
    "letter-spacing",
    "text-transform",
    "white-space",
    "vertical-align",
  ];
  originals.forEach((original, index) => {
    const copy = copies[index];
    const computed = getComputedStyle(original);
    if (!copy.style) return;
    copy.removeAttribute("style");
    for (const property of properties)
      copy.style.setProperty(property, computed.getPropertyValue(property));
    copy.style.fontFamily = computed.fontFamily.toLowerCase().includes("mono")
      ? 'ui-monospace, "Courier New", monospace'
      : "Arial, sans-serif";
    if (computed.display === "grid")
      copy.style.gridTemplateColumns =
        format === "sheet" ? "repeat(3, minmax(0, 1fr))" : "1fr";
    if (original.tagName.toLowerCase() === "svg") {
      copy.style.width = "100%";
      copy.style.height = computed.height;
    }
    if (original.classList.contains("print:hidden"))
      copy.dataset.printHide = "true";
    for (const attr of [...copy.attributes]) {
      if (attr.name.startsWith("on")) copy.removeAttribute(attr.name);
    }
  });
  clone
    .querySelectorAll("script, iframe, button, input, select, textarea")
    .forEach((element) => element.remove());
  main.appendChild(doc.importNode(clone, true));
  doc.body.append(main);
  const job = crypto.randomUUID();
  try {
    const session = JSON.parse(sessionStorage.getItem("PADDL_SESSION") || "null");
    if (!session || !["DEMO", "PRODUCTION"].includes(session.mode) ||
      (session.mode === "PRODUCTION" && !session.ownerId)) {
      toast.error("Sign in to your workspace, reopen the document, and print again.");
      return;
    }
    // Distinct snapshots keep multiple print tabs independent and survive reload.
    for (const key of Object.keys(localStorage).filter((key) =>
      key.startsWith("PADDL_PRINT_"),
    )) {
      try {
        if (
          Date.now() - JSON.parse(localStorage.getItem(key) || "{}").createdAt >
          86400000
        )
          localStorage.removeItem(key);
      } catch {
        /* Preserve an unreadable record. */
      }
    }
    localStorage.setItem(
      "PADDL_PRINT_" + job,
      JSON.stringify({
        title,
        html: "<!doctype html>" + doc.documentElement.outerHTML,
        createdAt: Date.now(),
        mode: session.mode,
        ownerId: session.mode === "PRODUCTION" ? session.ownerId : undefined,
      }),
    );
    const url = "/print?job=" + job;
    const preview = window.open(url, "_blank");
    if (preview) preview.opener = null;
    else toast.error("Allow pop-ups for Paddl to open the print preview.");
    toast("Print preview ready", {
      duration: 15000,
      action: {
        label: "Open here",
        // The fallback opens an independent print document without carrying register state.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        onClick: () => window.location.assign(url),
      },
    });
  } catch {
    toast.error(
      "Could not prepare the print preview. Free browser storage and try again.",
    );
  }
}
