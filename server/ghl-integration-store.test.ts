import assert from "node:assert/strict";
import test from "node:test";
import {
  ISHARE_GHL_LOCATION_ID,
  assertIShareGhlLocation,
  type GhlCredentials,
} from "./ghl-integration-store";

const token = "pit-test-token-long-enough";

test("iShare guard accepts only the authoritative BYx location", () => {
  const creds: GhlCredentials = {
    token,
    locationId: ISHARE_GHL_LOCATION_ID,
    source: "dashboard",
  };
  assert.equal(assertIShareGhlLocation(creds), creds);
});

test("iShare guard blocks another HighLevel location", () => {
  assert.throws(
    () =>
      assertIShareGhlLocation({
        token,
        locationId: "XLKMmX4V4Kju4Xzklda6",
        source: "dashboard",
      }),
    /Blocked iShare HighLevel operation/
  );
});

test("iShare guard blocks missing location", () => {
  assert.throws(
    () => assertIShareGhlLocation({ token, source: "env" }),
    /Blocked iShare HighLevel operation/
  );
});
