import assert from "node:assert/strict";
import Database from "better-sqlite3";
import {
  completeCommerceEvent,
  ensureCommerceEntitlementTables,
  getCommerceProductByCode,
  getMemberEntitledProducts,
  getMemberManuscripts,
  grantMemberProductEntitlement,
  listCommerceProducts,
  memberCanAccessLesson,
  memberCanAccessManuscript,
  recordCommerceEvent,
  revokeMemberProductEntitlement,
} from "./commerce-entitlements";

const db = new Database(":memory:");
db.pragma("foreign_keys = ON");
db.exec(`
  CREATE TABLE members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE
  );
  CREATE TABLE lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL
  );
`);

const lessonTitles = [
  "Listening Without Defending",
  "Owning Impact Without Shame",
  "The First Repair Sentence",
  "Presence Over Pressure",
  "When Your Adult Child Pulls Away",
  "Authority Without Control",
  "Apology Without Explanation",
  "Consistency After the Conversation",
  "Rebuilding Trust in Small Deposits",
  "When Silence Feels Personal",
  "Leading With Purpose, Not Panic",
  "Becoming Safe to Talk To",
];
const insertLesson = db.prepare("INSERT INTO lessons (title) VALUES (?)");
lessonTitles.forEach((title) => insertLesson.run(title));
const memberId = Number(db.prepare("INSERT INTO members (email) VALUES (?)").run("buyer@example.com").lastInsertRowid);

ensureCommerceEntitlementTables(db);
const products = listCommerceProducts(db);
assert.equal(products.length, 27, "Catalog must contain membership, 24 individual SKUs, and 2 bundles");
assert.equal(getCommerceProductByCode(db, "membership.community.monthly")?.price_cents, 499);
assert.equal(getCommerceProductByCode(db, "curriculum.digital.module.01")?.price_cents, 999);
assert.equal(getCommerceProductByCode(db, "curriculum.manuscript.module.01")?.price_cents, 999);
assert.equal(getCommerceProductByCode(db, "curriculum.digital.complete")?.price_cents, 5900);
assert.equal(getCommerceProductByCode(db, "curriculum.bundle.complete")?.price_cents, 9900);
assert(products.every((product) => product.tax_behavior === "exclusive"));

const lesson1 = db.prepare("SELECT id FROM lessons WHERE title = ?").get(lessonTitles[0]) as { id: number };
const lesson2 = db.prepare("SELECT id FROM lessons WHERE title = ?").get(lessonTitles[1]) as { id: number };
grantMemberProductEntitlement(db, { memberId, productCode: "curriculum.digital.module.01" });
assert.equal(memberCanAccessLesson(db, memberId, lesson1.id), true);
assert.equal(memberCanAccessLesson(db, memberId, lesson2.id), false);
assert.equal(getMemberManuscripts(db, memberId).length, 0);

revokeMemberProductEntitlement(db, memberId, "curriculum.digital.module.01");
assert.equal(memberCanAccessLesson(db, memberId, lesson1.id), false);

grantMemberProductEntitlement(db, { memberId, productCode: "curriculum.manuscript.module.02" });
assert.equal(memberCanAccessManuscript(db, memberId, "curriculum.manuscript.module.02"), true);
assert.equal(memberCanAccessManuscript(db, memberId, "curriculum.manuscript.module.01"), false);

revokeMemberProductEntitlement(db, memberId, "curriculum.manuscript.module.02");
grantMemberProductEntitlement(db, { memberId, productCode: "curriculum.digital.complete" });
assert.equal(getMemberEntitledProducts(db, memberId).filter((product) => product.format === "digital").length, 12);
assert.equal(getMemberManuscripts(db, memberId).length, 0);

revokeMemberProductEntitlement(db, memberId, "curriculum.digital.complete");
grantMemberProductEntitlement(db, { memberId, productCode: "curriculum.bundle.complete" });
assert.equal(getMemberEntitledProducts(db, memberId).filter((product) => product.format === "digital").length, 12);
assert.equal(getMemberManuscripts(db, memberId).length, 12);

const firstEvent = recordCommerceEvent(db, {
  eventKey: "stripe:checkout_001",
  provider: "stripe",
  eventType: "checkout.session.completed",
  productCode: "curriculum.bundle.complete",
});
const duplicateEvent = recordCommerceEvent(db, {
  eventKey: "stripe:checkout_001",
  provider: "stripe",
  eventType: "checkout.session.completed",
});
assert.equal(firstEvent, true);
assert.equal(duplicateEvent, false);
completeCommerceEvent(db, "stripe:checkout_001", "processed");
const event = db.prepare("SELECT status FROM commerce_events WHERE event_key = ?").get("stripe:checkout_001") as { status: string };
assert.equal(event.status, "processed");

console.log("Papa Life commerce entitlement tests passed.");
db.close();
