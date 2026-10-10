import assert from "node:assert/strict";
import {
  PAPA_SUPPORTER_CUTOVER_MS,
  hasLegacyPrepaidStreamingRights,
  isPapaSupporterMode,
  papaPublicPriceCents,
} from "./papa-commerce-transition";

const oldMember = {
  status: "active",
  payment_status: "paid",
  enrolled_at: "2026-10-10T00:00:00.000Z",
};
const newMember = { ...oldMember, enrolled_at: "2026-11-01T07:00:01.000Z" };

assert.equal(isPapaSupporterMode(PAPA_SUPPORTER_CUTOVER_MS - 1), false);
assert.equal(isPapaSupporterMode(PAPA_SUPPORTER_CUTOVER_MS), true);
assert.equal(isPapaSupporterMode(PAPA_SUPPORTER_CUTOVER_MS + 1), true);

assert.equal(hasLegacyPrepaidStreamingRights(oldMember), true, "Keep legacy paid member rights pending actual paid-through reconciliation");
assert.equal(hasLegacyPrepaidStreamingRights(newMember), false, "No new subscription privileges after cutover");
assert.equal(hasLegacyPrepaidStreamingRights({ ...oldMember, payment_status: "payment_required" }), false);
assert.equal(hasLegacyPrepaidStreamingRights({ ...oldMember, status: "inactive" }), false);
assert.equal(hasLegacyPrepaidStreamingRights({ ...oldMember, enrolled_at: undefined, created_at: undefined }), false);
assert.equal(hasLegacyPrepaidStreamingRights({ ...oldMember, enrolled_at: undefined, created_at: "2026-10-01T00:00:00.000Z" }), true);

assert.equal(papaPublicPriceCents({code:"curriculum.digital.module.01",price_cents:999,public_price_cents:null}),1499);
assert.equal(papaPublicPriceCents({code:"curriculum.digital.complete",price_cents:5900,public_price_cents:null}),7900);
assert.equal(papaPublicPriceCents({code:"curriculum.bundle.complete",price_cents:9900,public_price_cents:null}),12900);
assert.equal(papaPublicPriceCents({code:"curriculum.digital.module.01",price_cents:999,public_price_cents:1999}),1999);
assert.equal(papaPublicPriceCents({code:"curriculum.manuscript.module.01",price_cents:999,public_price_cents:null}),1499);
assert.equal(papaPublicPriceCents({code:"curriculum.digital.module.01",price_cents:999,public_price_cents:899}),999, "A lower configured public price must not undercut the established higher price");
assert.equal(papaPublicPriceCents({code:"curriculum.digital.complete",price_cents:5900,public_price_cents:7900}),7900);
assert.equal(papaPublicPriceCents({code:"curriculum.bundle.complete",price_cents:9900,public_price_cents:12900}),12900);
console.log("Papa Life November supporter/legacy-entitlement rules passed.");
