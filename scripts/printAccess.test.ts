import test from "node:test";
import assert from "node:assert/strict";
import { canViewPrintJob } from "../src/lib/printAccess.ts";

test("production print snapshots require the account that created them", () => {
  const job = { mode: "PRODUCTION", ownerId: "owner-a" };
  assert.equal(canViewPrintJob(job, "owner-a", "PRODUCTION"), true);
  assert.equal(canViewPrintJob(job, "owner-b", "PRODUCTION"), false);
  assert.equal(canViewPrintJob(job, undefined, "PRODUCTION"), false);
  assert.equal(canViewPrintJob({ mode: "PRODUCTION" }, "owner-a", "PRODUCTION"), false);
});

test("demo previews remain usable and unknown previews cannot open in production", () => {
  assert.equal(canViewPrintJob({ mode: "DEMO" }, undefined, "DEMO"), true);
  assert.equal(canViewPrintJob({}, undefined, "DEMO"), true);
  assert.equal(canViewPrintJob({}, "owner-a", "PRODUCTION"), false);
  assert.equal(canViewPrintJob({ mode: "UNKNOWN" }, "owner-a", "DEMO"), false);
});
