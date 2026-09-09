import assert from "node:assert/strict";
import { ANDROID_HEARTBEAT_INTERVAL_MS, isAndroidUserAgent, mobileTakeoverSessionRef, phoneIsInControl } from "./ai-boss-companion";

assert.equal(isAndroidUserAgent("Mozilla/5.0 (Linux; Android 15)"), true);
assert.equal(isAndroidUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X)"), false);
assert.equal(ANDROID_HEARTBEAT_INTERVAL_MS, 45_000);
assert.equal(mobileTakeoverSessionRef(123), "mobile-takeover-123");
assert.equal(phoneIsInControl({ android_online: true, mac_online: false }), true);
assert.equal(phoneIsInControl({ android_online: true, mac_online: true }), false);
assert.equal(phoneIsInControl({ android_online: false, mac_online: false }), false);
console.log("✓ Takeover heartbeat, mobile session prefix, and control-state rules are stable");
