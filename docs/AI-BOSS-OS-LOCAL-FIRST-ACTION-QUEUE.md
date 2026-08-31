# AI Boss OS local-first action queue

The action queue is the authority boundary between Brian's request and any connector, Mac, or AI execution.

## Routing order

1. Direct deterministic connector execution
2. Local Mac execution and private storage
3. Local-model inference
4. Optional named cloud provider

File operations, memory retrieval, Gmail/Calendar lookups, GitHub status reads, GHL operations, and Desktop Commander actions do not require a cloud model merely to run.

## Approval policy

Creating, updating, sending, publishing, deleting, executing, external-consequential work, sensitive work, and cloud-model use always require approval. Read-only deterministic actions can be policy-approved, but still run only when Brian presses **Run read-only**.

Every action records its route, provider when relevant, estimated external AI cost, status, source conversation, optional human-impact linkage, and an append-only audit trail.

## Provider independence

`ai-provider-contract.ts` is the canonical model boundary. Provider adapters translate their own request and response formats only at the edge. Executive memory, the action queue, connectors, and the user interface use provider-neutral types.

## Safety boundary

The executor foundation is limited to Gmail read/search through an explicitly configured private connector and local Mac/file read/search through a token-protected loopback bridge. Modifying actions have no registered executor. Local paths are canonicalized before approved-root checks, connector calls have timeouts and bounded responses, and complete structured results are stored separately from their short summaries.
