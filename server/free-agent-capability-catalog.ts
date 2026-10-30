/**
 * Free-first capability catalog for the existing 15-agent Papa Life OS architecture.
 * Discovery is not authorization: only a tested, allowlisted adapter may execute work.
 */
export type FreeAgentProvider = "papa-life-local"|"gohighlevel-included"|"google-workspace-existing"|"gemini-api-free"|"ollama-local";
export type CapabilityStatus = "verified-local"|"documented-free-needs-account-check"|"installed-readonly"|"not-installed"|"needs-authorization";
export type Capability = {
 id:string;
 provider:FreeAgentProvider;
 status:CapabilityStatus;
 tasks:readonly string[];
 costPolicy:"zero-only";
 externalWrites:boolean;
 limitations:string;
};
export const freeAgentCapabilities:readonly Capability[]=[
 {id:"local-fixed-package-worker",provider:"papa-life-local",status:"verified-local",tasks:["price-and-scope-lookup","fixed-quote-draft","order-job-ledger"],costPolicy:"zero-only",externalWrites:false,limitations:"Uses approved product registry; does not collect money or deliver work."},
 {id:"local-website-qa",provider:"papa-life-local",status:"verified-local",tasks:["website-local-build","static-quality-test","asset-inventory"],costPolicy:"zero-only",externalWrites:false,limitations:"Only existing allowlisted local work; no arbitrary shell or deployment."},
 {id:"ghl-workflow-builder",provider:"gohighlevel-included",status:"documented-free-needs-account-check",tasks:["workflow-design","template-generation"],costPolicy:"zero-only",externalWrites:false,limitations:"The builder is advertised free subject to limits; premium workflow AI actions and AI agents can cost extra. Confirm account billing first."},
 {id:"ghl-email-ai",provider:"gohighlevel-included",status:"documented-free-needs-account-check",tasks:["email-draft"],costPolicy:"zero-only",externalWrites:false,limitations:"Composing is not authorization to send; email transport may incur separate costs."},
 {id:"google-workspace-reader",provider:"google-workspace-existing",status:"installed-readonly",tasks:["drive-file-lookup","calendar-search"],costPolicy:"zero-only",externalWrites:false,limitations:"Current connector only supports Drive/Calendar read and search; it cannot write or deliver."},
 {id:"gemini-free-tier",provider:"gemini-api-free",status:"needs-authorization",tasks:["draft-report","summarize-opted-in-input"],costPolicy:"zero-only",externalWrites:false,limitations:"Not connected to Papa Life OS; free quotas, privacy terms, per-model availability, and zero-billing guard must be verified before use with customer data."},
 {id:"ollama-mac",provider:"ollama-local",status:"not-installed",tasks:["local-draft","local-classification"],costPolicy:"zero-only",externalWrites:false,limitations:"Ollama server unavailable on Mac mini at inspection; model hardware and license suitability must be checked before installation."}
] as const;
export function selectVerifiedFreeAgent(task:string){
 const match=freeAgentCapabilities.find(c=>c.status==="verified-local"&&c.tasks.includes(task)&&c.costPolicy==="zero-only");
 return match?{id:match.id,provider:match.provider,ready:true as const}:{ready:false as const,reason:"No verified free executor for this task; do not silently use pay-per-use AI"};
}
export function getFreeAgentAudit(){
 return {reviewed:freeAgentCapabilities.length,verified:freeAgentCapabilities.filter(c=>c.status==="verified-local").length,activeExternalWrites:0,paidAgentsEnabled:0,providers:freeAgentCapabilities};
}
