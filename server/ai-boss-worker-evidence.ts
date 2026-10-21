/** Fail closed: inspecting a knowledge base is not evidence that a task was delivered. */
export type WorkerEvidence = {
  kind: "http-check" | "local-report" | "read-only-analysis" | "external-receipt";
  description: string;
  reference: string;
};

export type EvidenceDecision =
  | { outcome: "completed"; summary: string; evidence: WorkerEvidence[] }
  | { outcome: "blocked"; explanation: string; next_step: string };

export function assessWorkerDeliverable(
  role: string,
  project: string,
  instruction: string,
  result: Record<string, unknown> | null,
): EvidenceDecision {
  const evidence = result?.evidence;
  const valid = Array.isArray(evidence) && evidence.length > 0 && evidence.length <= 25 &&
    evidence.every((item) => item && typeof item === "object" &&
      ["http-check", "local-report", "read-only-analysis", "external-receipt"].includes(item.kind) &&
      typeof item.description === "string" && item.description.trim().length >= 18 && item.description.length <= 500 &&
      typeof item.reference === "string" && item.reference.trim().length >= 4 && item.reference.length <= 1000);
  const summary = typeof result?.deliverable_summary === "string" ? result.deliverable_summary.trim() : "";
  if (result?.deliverable_verified === true && valid && summary.length >= 24 && summary.length <= 2000)
    return { outcome: "completed", summary, evidence: evidence as WorkerEvidence[] };

  const reason = typeof result?.block_reason === "string" && result.block_reason.trim().length >= 24
    ? result.block_reason.trim().slice(0, 1800)
    : "The worker returned a reference review, but did not provide verifiable evidence that the requested result was delivered.";
  const next = typeof result?.next_step === "string" && result.next_step.trim().length >= 12
    ? result.next_step.trim().slice(0, 900)
    : "Assign a worker with the required access and execution capability; review and approve the specific action before retrying.";
  return {
    outcome: "blocked",
    explanation: (role + " (" + project + "): " + reason + " Requested: " + instruction.slice(0, 230)).slice(0, 1990),
    next_step: next,
  };
}
