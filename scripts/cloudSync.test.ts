import test from "node:test";
import assert from "node:assert/strict";
import { reconcileCloud, cloudError } from "../src/lib/cloudSync.ts";
import { workspaceStorageKey } from "../src/lib/workspace.ts";

const checkpoint = { revision: 4, localRevision: 12, savedAt: "2026-10-09T00:00:00Z" };

test("first connection uploads local work only when there is no remote workspace", () => {
  assert.equal(reconcileCloud(2, undefined, null), "upload");
  assert.equal(reconcileCloud(0, undefined, 5), "download");
  assert.equal(reconcileCloud(2, undefined, 5), "conflict");
});

test("reconnect retains unsaved changes without accepting an unknown remote revision", () => {
  assert.equal(reconcileCloud(13, checkpoint, 4), "upload");
  assert.equal(reconcileCloud(13, checkpoint, 5), "conflict");
  assert.equal(reconcileCloud(12, checkpoint, 5), "download");
  assert.equal(reconcileCloud(12, checkpoint, null), "conflict");
});

test("production storage belongs to an account without changing legacy or demo keys", () => {
  assert.notEqual(workspaceStorageKey("MOTOR_SHOP", "PRODUCTION", "a"), workspaceStorageKey("MOTOR_SHOP", "PRODUCTION", "b"));
  assert.equal(workspaceStorageKey("MOTOR_SHOP", "DEMO", "a"), "PADDL_WORKSPACE_V4_MOTOR_SHOP");
  assert.equal(workspaceStorageKey("MOTOR_SHOP", "PRODUCTION"), "PADDL_PRODUCTION_V1_MOTOR_SHOP");
});

test("missing cloud schema produces actionable setup instructions", () => {
  assert.match(cloudError({ code: "PGRST205" }), /SQL Editor/);
  assert.equal(cloudError({ message: "Network request failed" }), "Network request failed");
});
