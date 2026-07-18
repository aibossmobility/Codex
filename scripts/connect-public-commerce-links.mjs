import path from "node:path";
import Database from "better-sqlite3";

const slugs = [
  "6a5aceb9a655fa0b802a4ec0", "6a5acef97b99151a5403f3d8", "6a5acf00a655fa0b802a4ec2",
  "6a5acf3aa655fa0b802a4ec3", "6a5acf407b99151a5403f3d9", "6a5acf47a655fa0b802a4ec4",
  "6a5acf4ea655fa0b802a4ec5", "6a5acf567b99151a5403f3dc", "6a5acf5ca655fa0b802a4ec6",
  "6a5acf63a655fa0b802a4ec7", "6a5acf697b99151a5403f3dd", "6a5acf72a655fa0b802a4ec8",
  "6a5acf797b99151a5403f3de", "6a5acf807b99151a5403f3e0", "6a5acf877b99151a5403f3e1",
  "6a5acf8ea655fa0b802a4eca", "6a5acf957b99151a5403f3e2", "6a5acf9c7b99151a5403f3e3",
  "6a5acfa37b99151a5403f3e4", "6a5acfaa7b99151a5403f3e5", "6a5acfb1a655fa0b802a4ecb",
  "6a5acfb87b99151a5403f3e6", "6a5acfc0a655fa0b802a4ecc", "6a5acfc7a655fa0b802a4ece",
  "6a5acfce7b99151a5403f3e7", "6a5acfd6a655fa0b802a4ecf",
];

const codes = [
  ...Array.from({ length: 12 }, (_, index) => `curriculum.digital.module.${String(index + 1).padStart(2, "0")}`),
  ...Array.from({ length: 12 }, (_, index) => `curriculum.manuscript.module.${String(index + 1).padStart(2, "0")}`),
  "curriculum.digital.complete",
  "curriculum.bundle.complete",
];

if (codes.length !== slugs.length) throw new Error("Public checkout map is incomplete");
const db = new Database(path.resolve(process.cwd(), "leads.db"));
const update = db.prepare(`UPDATE commerce_products SET public_checkout_url = ?, updated_at = datetime('now') WHERE code = ?`);
const connect = db.transaction(() => {
  codes.forEach((code, index) => {
    const result = update.run(`https://agent.bossmobility.net/payment-link/${slugs[index]}`, code);
    if (result.changes !== 1) throw new Error(`Catalog product not found: ${code}`);
  });
});
connect();

const connected = db.prepare(`SELECT COUNT(*) AS count FROM commerce_products WHERE public_checkout_url IS NOT NULL AND active = 1`).get();
console.log(JSON.stringify({ connected: connected.count }));
