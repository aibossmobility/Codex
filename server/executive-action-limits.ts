const DEFAULT_EXECUTOR_RESULT_MAX_BYTES = 900_000;
const MIN_EXECUTOR_RESULT_MAX_BYTES = 1_000;
const MAX_EXECUTOR_RESULT_MAX_BYTES = 900_000;

export function resolveExecutorResultMaxBytes() {
  const configured = Number(process.env.AI_BOSS_EXECUTOR_RESULT_MAX_BYTES || DEFAULT_EXECUTOR_RESULT_MAX_BYTES);
  if (!Number.isFinite(configured)) return DEFAULT_EXECUTOR_RESULT_MAX_BYTES;
  return Math.min(
    Math.max(Math.round(configured), MIN_EXECUTOR_RESULT_MAX_BYTES),
    MAX_EXECUTOR_RESULT_MAX_BYTES
  );
}

export function assertExecutorResultWithinLimit(serialized: string, label = "Executor result") {
  const maxBytes = resolveExecutorResultMaxBytes();
  const sizeBytes = Buffer.byteLength(serialized, "utf8");
  if (sizeBytes > maxBytes) {
    throw new Error(`${label} exceeds the ${maxBytes}-byte result limit.`);
  }
  return sizeBytes;
}
