import "dotenv/config";
import crypto from "node:crypto";
import path from "node:path";
import Database from "better-sqlite3";

const db = new Database(path.resolve(process.cwd(), "leads.db"));
const row = db.prepare(`
  SELECT api_token_enc, location_id
  FROM admin_ghl_integrations
  ORDER BY admin_user_id ASC
  LIMIT 1
`).get();

if (!row?.api_token_enc || !row?.location_id) throw new Error("Stored HighLevel credentials are unavailable");
const keySource = process.env.INTEGRATION_ENCRYPTION_KEY?.trim() || process.env.SESSION_SECRET?.trim() || "papalife-integration-key-rotate-in-production";
const key = crypto.createHash("sha256").update(keySource).digest();
const blob = Buffer.from(row.api_token_enc, "base64");
const decipher = crypto.createDecipheriv("aes-256-gcm", key, blob.subarray(0, 12));
decipher.setAuthTag(blob.subarray(12, 28));
const token = Buffer.concat([decipher.update(blob.subarray(28)), decipher.final()]).toString("utf8");
const headers = { Authorization: `Bearer ${token}`, Accept: "application/json", Version: "v3" };

const response = await fetch(`https://services.leadconnectorhq.com/products/?locationId=${encodeURIComponent(row.location_id)}&limit=100`, { headers });
const payload = await response.json();
if (!response.ok) throw new Error(`HighLevel product audit failed (${response.status}): ${JSON.stringify(payload).slice(0, 500)}`);
const products = payload.products || payload.data || [];
const papa = products.filter((product) => /papa life/i.test(product.name || ""));

for (const product of papa) {
  const productId = product._id || product.id;
  const priceResponse = await fetch(`https://services.leadconnectorhq.com/products/${encodeURIComponent(productId)}/price?locationId=${encodeURIComponent(row.location_id)}&limit=100`, { headers });
  const pricePayload = await priceResponse.json();
  const prices = pricePayload.prices || pricePayload.data || [];
  if (/Member Audio Lesson 01/.test(product.name || "")) {
    console.log(JSON.stringify({ samplePricePayload: pricePayload }));
  }
  console.log(JSON.stringify({
    id: productId,
    name: product.name,
    prices: prices.map((price) => ({ id: price._id || price.id, amount: price.amount, currency: price.currency, type: price.type || price.billingType }))
  }));
}
