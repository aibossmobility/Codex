/** Two-brand self-service customer journey. Pure routing policy, no side effects or paid calls.
 * Consumer workers must still validate evidence and permissions before mutations.
 */
import { workerRoles } from "./ai-boss-worker-assignments";

export type CustomerBrand = "papa-life" | "ai-boss-mobility";
export type JourneyStage = "welcome" | "catalog" | "estimate" | "consent" | "payment" | "production" | "quality" | "delivery" | "support" | "exception";
export type ExistingWorkerRole = typeof workerRoles[number];

export const customerJourneyAssignments: Readonly<Record<JourneyStage, {
  role: ExistingWorkerRole;
  operation: string;
  completionEvidence: string;
  requiresVerifiedPayment: boolean;
  automaticWhenSafe: boolean;
}>> = {
  welcome: {role:"ghl-customer-service",operation:"Digital twin answers public questions, transparently identifies itself, and offers matching packages",completionEvidence:"Visitor sees appropriate package options",requiresVerifiedPayment:false,automaticWhenSafe:true},
  catalog: {role:"seo-website",operation:"Show brand-scoped fixed packages, deliverables, boundaries and prices from approved catalog",completionEvidence:"Correct tenant and matching published price",requiresVerifiedPayment:false,automaticWhenSafe:true},
  estimate: {role:"crm-sales",operation:"Generate deterministic fixed-scope quote; selected items do not create arbitrary discounts",completionEvidence:"Immutable quote version and selected package",requiresVerifiedPayment:false,automaticWhenSafe:true},
  consent: {role:"crm-sales",operation:"Capture customer acceptance, and separate authorizations for external system access",completionEvidence:"Dated agreement and customer permissions",requiresVerifiedPayment:false,automaticWhenSafe:true},
  payment: {role:"finance-records",operation:"Verify GoHighLevel transaction and order server-side with live-mode, tenant, product, exact amount, refund and idempotency checks",completionEvidence:"Authoritative completed payment record; never browser redirect alone",requiresVerifiedPayment:false,automaticWhenSafe:false},
  production: {role:"ai-boss-mobility-director",operation:"Produce only the bought fixed-scope digital outputs; delegate approved draft work to free or existing tools",completionEvidence:"Versioned digital deliverables and a repeatable job log",requiresVerifiedPayment:true,automaticWhenSafe:false},
  quality: {role:"quality-compliance",operation:"Validate deliverables against paid scope, accuracy, access rights and explicit tests",completionEvidence:"Pass/fail results, source files and test log",requiresVerifiedPayment:true,automaticWhenSafe:false},
  delivery: {role:"content-distribution",operation:"Release access or digital files securely after verification and passing quality checks",completionEvidence:"Customer-accessible resource or receipt and timestamp",requiresVerifiedPayment:true,automaticWhenSafe:false},
  support: {role:"ghl-customer-service",operation:"Digital twin handles access questions, purchase status and safe retry without extra charge",completionEvidence:"Support case resolved or documented escalation",requiresVerifiedPayment:false,automaticWhenSafe:true},
  exception: {role:"quality-compliance",operation:"Escalate only unresolved payment, authorization, security or technical failures to Brian",completionEvidence:"Specific reason, evidence, and requested decision",requiresVerifiedPayment:false,automaticWhenSafe:false},
};

export const brandDirectors: Readonly<Record<CustomerBrand, ExistingWorkerRole>> = {
  "papa-life":"papa-life-director",
  "ai-boss-mobility":"ai-boss-mobility-director",
};

export const freeToolPolicy = Object.freeze({
  primaryExecution: "existing Papa Life OS and Desktop Commander tools",
  workspace: "Google Drive and Calendar read-only connector; use connected Gmail only with authorized send permission",
  gemini: "optional only after explicit approval, verified no-charge quota and configured adapter; never assume free",
  alternateModels: "use deterministic templates and existing local models first; do not spend paid Work credits",
  externalPurchases: false,
  zapier: false,
  humanForOrdinarySteps: false,
});

/** Validate routing separately from proof of readiness. Never invoke an unverified write route. */
export function buildCustomerJourney(brand: CustomerBrand) {
  if (brand !== "papa-life" && brand !== "ai-boss-mobility") throw Error("Unknown brand");
  return (Object.keys(customerJourneyAssignments) as JourneyStage[]).map(stage => ({
    brand,
    stage,
    worker: stage==="production" ? brandDirectors[brand] : customerJourneyAssignments[stage].role,
    ...customerJourneyAssignments[stage],
    // No stage involving payment, production or delivery is marked operational by a routing plan alone.
    operational: false as const,
  })).map(item=>({...item,worker:item.stage==="production"?brandDirectors[brand]:item.worker}));
}
