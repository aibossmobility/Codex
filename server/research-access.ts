/**
 * Research Lab is private: only listed admin usernames (Brian) see the web UI.
 * MCP research tools require RESEARCH_LAB_MCP_ENABLED=true on the server.
 */

export function parseResearchLabAdminAllowlist(): Set<string> {
  const raw = process.env.RESEARCH_LAB_ADMIN_USERNAMES || "";
  return new Set(raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
}

/** Web / session: allowed only if username is in RESEARCH_LAB_ADMIN_USERNAMES (comma-separated). */
export function isResearchLabWebUser(username: string | undefined | null): boolean {
  const allow = parseResearchLabAdminAllowlist();
  if (allow.size === 0) return false;
  const u = String(username ?? "").trim().toLowerCase();
  return u.length > 0 && allow.has(u);
}

/** MCP tools for Research Lab — off unless explicitly enabled (Brian's automation). */
export function assertResearchLabMcpEnabled(): void {
  if (process.env.RESEARCH_LAB_MCP_ENABLED !== "true") {
    throw new Error(
      "Research Lab MCP tools are disabled. Set RESEARCH_LAB_MCP_ENABLED=true on the server to enable (Brian-only automation)."
    );
  }
}
