import assert from "node:assert/strict";
import { resolvePapaDbDirectory } from "./papa-db-location";

assert.equal(resolvePapaDbDirectory("/app", {}),"/app");
assert.equal(resolvePapaDbDirectory("/users/local", {NODE_ENV:"production"}),"/users/local");
const full = new Set(["/data/leads.db","/data/sessions.db"]);
assert.equal(resolvePapaDbDirectory("/app", {RAILWAY_ENVIRONMENT:"production"}, x=>full.has(x)),"/data");
assert.throws(()=>resolvePapaDbDirectory("/app",{RAILWAY_ENVIRONMENT:"production"},x=>x==="/data/leads.db"));
assert.throws(()=>resolvePapaDbDirectory("/app",{RAILWAY_PROJECT_ID:"p"},()=>false));
console.log("Railway persistent data and session DB required; local development unchanged");
