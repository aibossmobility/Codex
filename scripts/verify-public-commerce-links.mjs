import path from "node:path";
import Database from "better-sqlite3";

const db = new Database(path.resolve(process.cwd(), "leads.db"), { readonly: true });
const rows = db.prepare(`
  SELECT code, public_price_cents, public_checkout_url
  FROM commerce_products
  WHERE active = 1 AND code != 'membership.community.monthly'
  ORDER BY code
`).all();

if (rows.length !== 26) throw new Error(`Expected 26 public products, found ${rows.length}`);
const failures = [];
for (const row of rows) {
  const expected = row.code.includes(".module.") ? 1499 : row.code === "curriculum.digital.complete" ? 7900 : 12900;
  if (row.public_price_cents !== expected) failures.push(`${row.code}: price ${row.public_price_cents}, expected ${expected}`);
  if (!/^https:\/\/agent\.bossmobility\.net\/payment-link\/[a-f0-9]{24}$/.test(row.public_checkout_url || "")) {
    failures.push(`${row.code}: invalid checkout URL`);
    continue;
  }
  try {
    const response = await fetch(row.public_checkout_url, { redirect: "follow" });
    if (!response.ok) failures.push(`${row.code}: checkout HTTP ${response.status}`);
  } catch (error) {
    failures.push(`${row.code}: ${String(error)}`);
  }
}

const liveResponse = await fetch("https://bossmobilelifecoach.com/api/public/commerce-catalog");
const live = await liveResponse.json();
const liveProducts = (live.products || []).filter((product) => product.code !== "membership.community.monthly");
if (!liveResponse.ok) failures.push(`Live catalog HTTP ${liveResponse.status}`);
if (liveProducts.length !== 26) failures.push(`Live catalog count ${liveProducts.length}`);
if (liveProducts.filter((product) => product.public_checkout_url).length !== 26) failures.push("Live catalog does not expose exactly 26 public checkout URLs");

console.log(JSON.stringify({
  ok: failures.length === 0,
  database_products: rows.length,
  reachable_checkouts: rows.length - failures.filter((failure) => failure.includes("HTTP") || failure.includes("fetch")).length,
  live_products: liveProducts.length,
  live_buy_links: liveProducts.filter((product) => product.public_checkout_url).length,
  public_prices: [...new Set(liveProducts.map((product) => product.public_price_cents))].sort((a, b) => a - b),
  member_prices: [...new Set(liveProducts.map((product) => product.member_price_cents))].sort((a, b) => a - b),
  failures,
}, null, 2));
if (failures.length) process.exitCode = 1;
