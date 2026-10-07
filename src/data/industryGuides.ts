import type { ShopPreset } from "./shopPresets";
export const industryGuides: Record<
  ShopPreset["id"],
  {
    title: string;
    short: string;
    accent: string;
    workflow: string;
    steps: string[];
    destinations: ("pos" | "credit" | "inventory" | "purchases" | "reports")[];
    tip: string;
  }
> = {
  SARI_SARI: {
    destinations: ["pos", "pos", "credit", "purchases"],
    title: "Sari-sari & grocery",
    short: "Everyday essentials, everyday suki.",
    accent: "emerald",
    workflow: "From tingi to a thriving tindahan",
    steps: [
      "Ring up a basket of daily essentials",
      "Record an utang sale for a regular customer",
      "Collect a partial payment in the credit book",
      "Receive stock and reconcile your cash",
    ],
    tip: "Keep customer credit within a clear limit. A sale on utang increases receivables, not the cash in your drawer.",
  },
  MOTOR_SHOP: {
    destinations: ["pos", "pos", "pos", "pos"],
    title: "Motor parts & repair",
    short: "Parts and labor, on one receipt.",
    accent: "orange",
    workflow: "The whole repair, in one place",
    steps: [
      "Find parts by name or barcode",
      "Add parts and mechanic labor to a cart",
      "Hold the order while the repair is underway",
      "Resume the order and take a split payment",
    ],
    tip: "Hold each job as a named order, then resume it when the customer picks up. Stock is deducted only at checkout.",
  },
  PHARMACY: {
    destinations: ["inventory", "pos", "inventory", "purchases"],
    title: "Pharmacy & wellness",
    short: "Stock visibility that puts care first.",
    accent: "blue",
    workflow: "A clearer view of every shelf",
    steps: [
      "Review low-stock and expiry alerts",
      "Find products by generic or brand name",
      "Check product batch and expiry details",
      "Receive stock and review the sales history",
    ],
    tip: "Expired products are blocked at checkout. This demo is an inventory tool; prescription verification and regulated dispensing need a dedicated production workflow.",
  },
  MILK_TEA: {
    destinations: ["pos", "pos", "pos", "reports"],
    title: "Milk tea & café",
    short: "Less admin. More happy regulars.",
    accent: "violet",
    workflow: "Keep the counter moving",
    steps: [
      "Build a drinks and add-ons order",
      "Hold an order while a customer decides",
      "Accept cash and a digital payment together",
      "See top sellers and close the shift",
    ],
    tip: "Use named held orders for busy periods. These are saved orders, not a kitchen queue; ingredient recipes are a future extension.",
  },
};
