// server/ai-boss-local-bridge.ts
import http from "node:http";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { z } from "zod";

// server/executive-action-limits.ts
var DEFAULT_EXECUTOR_RESULT_MAX_BYTES = 9e5;
var MIN_EXECUTOR_RESULT_MAX_BYTES = 1e3;
var MAX_EXECUTOR_RESULT_MAX_BYTES = 9e5;
function resolveExecutorResultMaxBytes() {
  const configured = Number(process.env.AI_BOSS_EXECUTOR_RESULT_MAX_BYTES || DEFAULT_EXECUTOR_RESULT_MAX_BYTES);
  if (!Number.isFinite(configured)) return DEFAULT_EXECUTOR_RESULT_MAX_BYTES;
  return Math.min(
    Math.max(Math.round(configured), MIN_EXECUTOR_RESULT_MAX_BYTES),
    MAX_EXECUTOR_RESULT_MAX_BYTES
  );
}
function assertExecutorResultWithinLimit(serialized, label = "Executor result") {
  const maxBytes = resolveExecutorResultMaxBytes();
  const sizeBytes = Buffer.byteLength(serialized, "utf8");
  if (sizeBytes > maxBytes) {
    throw new Error(`${label} exceeds the ${maxBytes}-byte result limit.`);
  }
  return sizeBytes;
}

// server/ai-boss-local-bridge.ts
var bridgeRequestSchema = z.object({
  action_id: z.number().int().positive(),
  action_type: z.enum(["read", "search"]),
  target_system: z.enum(["desktop_commander", "files"]),
  target_ref: z.string().trim().min(1).max(1e3),
  requested_outcome: z.string().trim().min(3).max(4e3),
  authority_level: z.literal("observe")
}).strict();
async function allowedRoots() {
  const configured = String(process.env.AI_BOSS_LOCAL_ALLOWED_ROOTS || "").trim();
  const roots = configured ? configured.split(path.delimiter) : [os.homedir()];
  return Promise.all(roots.map((root) => root.trim()).filter(Boolean).map((root) => fs.realpath(path.resolve(root))));
}
async function resolveAllowedPath(rawPath) {
  const candidate = await fs.realpath(path.resolve(rawPath.replace(/^(file|dir):/, "")));
  const roots = await allowedRoots();
  const allowed = roots.some((root) => candidate === root || candidate.startsWith(`${root}${path.sep}`));
  if (!allowed) throw new Error("Requested path is outside AI Boss OS approved local roots.");
  return candidate;
}
function parseSearchTarget(targetRef) {
  const marker = "::query=";
  const markerIndex = targetRef.lastIndexOf(marker);
  if (markerIndex < 0) {
    throw new Error(`Search targets must include ${marker}<text>.`);
  }
  const target = targetRef.slice(0, markerIndex);
  const query = targetRef.slice(markerIndex + marker.length).trim();
  if (!target || !query) throw new Error("Search target and query are required.");
  return { target, query };
}
async function desktopRead(targetRef) {
  if (targetRef === "mac:status") {
    return {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      uptime_seconds: Math.round(os.uptime()),
      free_memory_bytes: os.freemem(),
      total_memory_bytes: os.totalmem(),
      home_directory: os.homedir()
    };
  }
  if (targetRef === "mac:processes") {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const run = promisify(execFile);
    const { stdout } = await run("/bin/ps", ["-axo", "pid=,comm="], { maxBuffer: Math.min(512e3, resolveExecutorResultMaxBytes()) });
    return stdout.split("\n").filter(Boolean).slice(0, 500).map((line) => line.trim());
  }
  throw new Error(`Unsupported Desktop Commander read target: ${targetRef}`);
}
async function desktopSearch(targetRef) {
  const { target, query } = parseSearchTarget(targetRef);
  if (target !== "mac:processes") {
    throw new Error(`Unsupported Desktop Commander search target: ${target}`);
  }
  const processes = await desktopRead(target);
  const normalizedQuery = query.toLocaleLowerCase();
  const matches = processes.filter((process2) => process2.toLocaleLowerCase().includes(normalizedQuery));
  return { query, match_count: matches.length, matches };
}
async function filesRead(targetRef) {
  if (targetRef.startsWith("file:")) {
    const filePath = await resolveAllowedPath(targetRef);
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) throw new Error("Requested file target is not a regular file.");
    const maxBytes = resolveExecutorResultMaxBytes();
    if (stat.size > maxBytes) throw new Error(`Local bridge file reads are limited to ${maxBytes} bytes.`);
    const content = await fs.readFile(filePath, "utf8");
    return { path: filePath, size_bytes: stat.size, content };
  }
  if (targetRef.startsWith("dir:")) {
    const directoryPath = await resolveAllowedPath(targetRef);
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });
    return entries.slice(0, 500).map((entry) => ({ name: entry.name, type: entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other" }));
  }
  throw new Error(`Unsupported files read target: ${targetRef}`);
}
async function filesSearch(targetRef) {
  const { target, query } = parseSearchTarget(targetRef);
  const normalizedQuery = query.toLocaleLowerCase();
  if (target.startsWith("file:")) {
    const filePath = await resolveAllowedPath(target);
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) throw new Error("Requested file target is not a regular file.");
    const maxBytes = resolveExecutorResultMaxBytes();
    if (stat.size > maxBytes) throw new Error(`Local bridge file searches are limited to ${maxBytes} bytes.`);
    const content = await fs.readFile(filePath, "utf8");
    const matches = content.split(/\r?\n/).flatMap(
      (line, index) => line.toLocaleLowerCase().includes(normalizedQuery) ? [{ line_number: index + 1, text: line }] : []
    ).slice(0, 200);
    return { path: filePath, query, match_count: matches.length, matches };
  }
  if (target.startsWith("dir:")) {
    const directoryPath = await resolveAllowedPath(target);
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });
    const matches = entries.filter((entry) => entry.name.toLocaleLowerCase().includes(normalizedQuery)).slice(0, 500).map((entry) => ({ name: entry.name, type: entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other" }));
    return { path: directoryPath, query, match_count: matches.length, matches };
  }
  throw new Error(`Unsupported files search target: ${target}`);
}
async function executeLocalBridgeRequest(raw) {
  const request = bridgeRequestSchema.parse(raw);
  if (request.action_type !== "read" && request.action_type !== "search") {
    throw new Error("Local bridge currently supports read/search actions only.");
  }
  const details = request.target_system === "desktop_commander" ? request.action_type === "search" ? await desktopSearch(request.target_ref) : await desktopRead(request.target_ref) : request.action_type === "search" ? await filesSearch(request.target_ref) : await filesRead(request.target_ref);
  return {
    ok: true,
    bridge_version: "1",
    action_id: request.action_id,
    summary: `${request.target_system} ${request.action_type} completed locally.`,
    details
  };
}
async function readJson(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 1e6) throw new Error("Request body too large.");
  }
  return JSON.parse(body || "{}");
}
function createLocalBridgeServer() {
  const token = String(process.env.AI_BOSS_LOCAL_BRIDGE_TOKEN || "").trim();
  if (!token) throw new Error("AI_BOSS_LOCAL_BRIDGE_TOKEN is required.");
  return http.createServer(async (req, res) => {
    res.setHeader("content-type", "application/json");
    if (req.method === "GET" && req.url === "/health") {
      res.end(JSON.stringify({ ok: true, service: "ai-boss-local-bridge", version: "1" }));
      return;
    }
    if (req.method !== "POST" || req.url !== "/execute") {
      res.statusCode = 404;
      res.end(JSON.stringify({ ok: false, error: "Not found" }));
      return;
    }
    if (req.headers.authorization !== `Bearer ${token}`) {
      res.statusCode = 401;
      res.end(JSON.stringify({ ok: false, error: "Unauthorized" }));
      return;
    }
    try {
      const result = await executeLocalBridgeRequest(await readJson(req));
      const serialized = JSON.stringify(result);
      assertExecutorResultWithinLimit(serialized, "Local bridge response");
      res.end(serialized);
    } catch (error) {
      res.statusCode = 400;
      res.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
    }
  });
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const port = Number(process.env.AI_BOSS_LOCAL_BRIDGE_PORT || 4765);
  createLocalBridgeServer().listen(port, "127.0.0.1", () => {
    console.log(`AI Boss OS local bridge listening on http://127.0.0.1:${port}`);
  });
}
export {
  createLocalBridgeServer,
  executeLocalBridgeRequest
};
