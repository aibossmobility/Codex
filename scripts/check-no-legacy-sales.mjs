import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const file = (name) => fs.readFileSync(path.join(root, name), "utf8");
const index = file("server/index.ts");
const join = file("client/public/go/join/index.html");
const form = file("client/src/components/CheckoutForm.tsx");
const installer = file("scripts/connect-public-commerce-links.mjs");
const envExample = file(".env.example");

// Regression protection: never restore an Alpha/P2P-era hosted payment page.
for (const [filename, content] of [
  ["server/index.ts", index],
  ["client/public/go/join/index.html", join],
  ["client/src/components/CheckoutForm.tsx", form],
  [".env.example", envExample],
]) {
  assert.ok(!/https?:\/\/agent\.bossmobility\.net/i.test(content), filename + " contains a legacy payment URL");
}
assert.ok(!/external-tracking\.js/i.test(join), "Legacy tracking must not run from join doorway");
assert.ok(/const destination = "\/sales-transition";/.test(index), "Join route must remain internal and safe");
assert.ok(/public_checkout_url: null/.test(index), "Public catalog must not expose legacy checkout links");
assert.ok(/checkout_url: null/.test(index), "Member catalog must not expose legacy checkout links");
assert.ok(/Legacy membership checkout is closed/.test(index), "New legacy recurring checkout must remain closed");
assert.ok(/New product-sales provisioning is paused/.test(index), "Unknown-source sales webhooks must not grant access");
assert.ok(/permanently disabled/i.test(installer), "Old link installer must be disabled");
assert.ok(!/window\.open\(/.test(form), "Legacy checkout form must not open payment URLs");
console.log("Legacy checkout and P2P payment links are blocked in all guarded sales entry points.");
