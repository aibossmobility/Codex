import "dotenv/config";
import crypto from "node:crypto";
import path from "node:path";
import Database from "better-sqlite3";

const apply = process.argv.includes("--apply");
const db = new Database(path.resolve(process.cwd(), "leads.db"));
const row = db.prepare(`SELECT api_token_enc, location_id FROM admin_ghl_integrations ORDER BY admin_user_id ASC LIMIT 1`).get();
if (!row?.api_token_enc || !row?.location_id) throw new Error("Stored HighLevel credentials are unavailable");

const keySource = process.env.INTEGRATION_ENCRYPTION_KEY?.trim() || process.env.SESSION_SECRET?.trim() || "papalife-integration-key-rotate-in-production";
const key = crypto.createHash("sha256").update(keySource).digest();
const blob = Buffer.from(row.api_token_enc, "base64");
const decipher = crypto.createDecipheriv("aes-256-gcm", key, blob.subarray(0, 12));
decipher.setAuthTag(blob.subarray(12, 28));
const token = Buffer.concat([decipher.update(blob.subarray(28)), decipher.final()]).toString("utf8");
const headers = { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json", Version: "v3" };
const base = "https://services.leadconnectorhq.com";

const productsResponse = await fetch(`${base}/products/?locationId=${encodeURIComponent(row.location_id)}&limit=100`, { headers });
const productsPayload = await productsResponse.json();
if (!productsResponse.ok) throw new Error(`Product list failed (${productsResponse.status})`);

function targetFor(product) {
  let match = /^Papa Life Member Audio Lesson (\d{2})/.exec(product.name || "");
  if (match) return { code: `curriculum.digital.module.${match[1]}`, amount: 14.99 };
  match = /^Papa Life Lesson (\d{2}).*Manuscript PDF$/.exec(product.name || "");
  if (match) return { code: `curriculum.manuscript.module.${match[1]}`, amount: 14.99 };
  if (product.name === "Papa Life — Complete 12-Lesson Canonical Audio Curriculum") return { code: "curriculum.digital.complete", amount: 79 };
  if (product.name === "Papa Life — Complete Permanent Digital Curriculum + 12 Manuscripts") return { code: "curriculum.bundle.complete", amount: 129 };
  return null;
}

const products = productsPayload.products || productsPayload.data || [];
const results = [];
for (const product of products) {
  const target = targetFor(product);
  if (!target) continue;
  const productId = product._id || product.id;
  const pricesResponse = await fetch(`${base}/products/${encodeURIComponent(productId)}/price?locationId=${encodeURIComponent(row.location_id)}&limit=100`, { headers });
  const pricesPayload = await pricesResponse.json();
  if (!pricesResponse.ok) throw new Error(`Price list failed for ${product.name} (${pricesResponse.status})`);
  const prices = pricesPayload.prices || pricesPayload.data || [];
  let publicPrice = prices.find((price) => price.type === "one_time" && Number(price.amount) === target.amount);

  if (!publicPrice && apply) {
    const createResponse = await fetch(`${base}/products/${encodeURIComponent(productId)}/price`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: `Regular Price — ${product.name.replace("Member ", "")} @ ${target.amount.toFixed(2)}`,
        type: "one_time",
        currency: "USD",
        amount: target.amount,
        locationId: row.location_id,
        description: product.description || "Papa Life permanent one-time purchase.",
        isDigitalProduct: true,
      }),
    });
    const createPayload = await createResponse.json();
    if (!createResponse.ok) throw new Error(`Create price failed for ${product.name} (${createResponse.status}): ${JSON.stringify(createPayload).slice(0, 500)}`);
    publicPrice = createPayload.price || createPayload;
  }

  const priceId = publicPrice?._id || publicPrice?.id || null;
  if (priceId && apply) {
    db.prepare(`UPDATE commerce_products SET public_price_cents = ?, public_external_product_id = ?, public_external_price_id = ?, updated_at = datetime('now') WHERE code = ?`)
      .run(Math.round(target.amount * 100), productId, priceId, target.code);
  }
  results.push({ code: target.code, amount: target.amount, productId, priceId, action: publicPrice ? (apply ? "ready" : "exists") : "would_create" });
}

console.log(JSON.stringify({ apply, count: results.length, ready: results.filter((item) => item.priceId).length, results }, null, 2));
