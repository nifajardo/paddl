// Applied both when creating a document and when opening an older snapshot.
export const PRINT_LAYOUT_FIXES = `
  .print-document { max-width: 100%; }
  .print-document > .print-receipt { width: 100%; max-width: 100%; padding: 0 !important; margin: 0 !important; }
  .print-document .print-receipt * { min-width: 0; overflow-wrap: anywhere; }
  .print-document .print-receipt [style*="display: flex"] { gap: 2mm !important; }
  .print-document .print-receipt [style*="display: flex"] > .truncate { flex: 1 1 0% !important; white-space: normal !important; }
  .print-document .receipt-item-row { display: grid !important; grid-template-columns: minmax(0, 1fr) max-content !important; align-items: start !important; gap: 2mm !important; }
  .print-document .receipt-item-name { white-space: normal !important; overflow-wrap: anywhere; }
  .print-document .receipt-item-amount { white-space: nowrap !important; }
`;
