export type RoutedInstruction = {
  action_type: "search";
  target_system: "gmail" | "google_calendar" | "google_drive";
  target_ref: string;
  requested_outcome: string;
  authority_level: "observe";
  execution_route: "direct";
  approval_required: false;
  estimated_external_ai_cost_micros: 0;
  work_kind: "action";
};

function searchTerms(instruction: string, terms: RegExp) {
  const cleaned = instruction
    .replace(terms, " ")
    .replace(/\b(check|find|look up|look for|review|search|show|open|my|the|please|for|in)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned;
}

/**
 * Routes safe, read-only Workspace requests without using an AI model.
 * Anything ambiguous remains a captured instruction for human/agent review.
 */
export function routeAiBossInstruction(rawInstruction: string): RoutedInstruction | null {
  const instruction = String(rawInstruction || "").trim();
  if (!instruction) return null;

  const calendarTerms = /\b(calendar|appointment|appointments|event|events|meeting|meetings|schedule)\b/gi;
  const driveTerms = /\b(google drive|drive|google doc|google docs|doc|docs|sheet|sheets|slide|slides|file|files)\b/gi;
  const gmailTerms = /\b(gmail|email|emails|inbox|message|messages|mail)\b/gi;

  let targetSystem: RoutedInstruction["target_system"] | null = null;
  let terms: RegExp | null = null;
  if (calendarTerms.test(instruction)) {
    targetSystem = "google_calendar";
    terms = calendarTerms;
  } else if (driveTerms.test(instruction)) {
    targetSystem = "google_drive";
    terms = driveTerms;
  } else if (gmailTerms.test(instruction)) {
    targetSystem = "gmail";
    terms = gmailTerms;
  }
  if (!targetSystem || !terms) return null;

  const query = searchTerms(instruction, terms);
  return {
    action_type: "search",
    target_system: targetSystem,
    target_ref: `query:${query}`,
    requested_outcome: instruction,
    authority_level: "observe",
    execution_route: "direct",
    approval_required: false,
    estimated_external_ai_cost_micros: 0,
    work_kind: "action",
  };
}
