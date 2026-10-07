import test from "node:test";
import assert from "node:assert/strict";
import {
  workspaceStorageKey,
  cloudWorkspaceKey,
  productionDefaults,
  appMode,
} from "../src/lib/workspace.ts";
import { ALL_SHOP_PRESETS } from "../src/data/shopPresets.ts";
import { INITIAL_STAFF } from "../src/data/mockData.ts";

test("legacy workspace keys retain demo records and production keys are separate", () => {
  for (const industry of Object.keys(ALL_SHOP_PRESETS)) {
    assert.equal(
      workspaceStorageKey(industry),
      "PADDL_WORKSPACE_V4_" + industry,
    );
    assert.notEqual(
      workspaceStorageKey(industry, "DEMO"),
      workspaceStorageKey(industry, "PRODUCTION"),
    );
    assert.notEqual(
      cloudWorkspaceKey(industry, "DEMO"),
      cloudWorkspaceKey(industry, "PRODUCTION"),
    );
  }
  assert.equal(appMode(undefined), "DEMO");
});
test("every production industry begins without sample records, balances, wallets, or default PINs", () => {
  for (const preset of Object.values(ALL_SHOP_PRESETS)) {
    const settingsBefore = structuredClone(preset.settings);
    const staffBefore = structuredClone(INITIAL_STAFF);
    const clean = productionDefaults(preset.settings, INITIAL_STAFF[0]);
    for (const key of [
      "products",
      "customers",
      "transactions",
      "expenses",
      "debtEntries",
      "auditLogs",
      "returnRecords",
      "stockReceipts",
      "shiftHistory",
      "cart",
      "heldCarts",
    ] as const)
      assert.deepEqual(clean[key], []);
    assert.equal(clean.staffList.length, 1);
    assert.equal(clean.currentStaff.pin, "");
    assert.equal(clean.settings.ownerPin, "");
    assert.equal(clean.settings.gcashNumber, "");
    assert.equal(clean.settings.mayaNumber, "");
    assert.equal(clean.settings.qrPhImageUrl, "");
    assert.equal(clean.settings.storeName, "Your business");
    assert.equal(clean.cashDrawer.status, "CLOSED");
    assert.equal(clean.cashDrawer.expectedCash, 0);
    clean.currentStaff.permissions!.canManageSettings = false;
    assert.deepEqual(preset.settings, settingsBefore);
    assert.deepEqual(INITIAL_STAFF, staffBefore);
  }
});
