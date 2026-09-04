# AI Boss OS — Unified Orchestrator

## Decision

The Unified Orchestrator is a core execution subsystem **inside AI Boss OS**. It is not a separate operating system, dashboard, or parallel authority layer.

**Flow:** Brian → AI Boss OS → Unified Orchestrator → Executive Action Queue → Approved/eligible executor → Connected system → Result/audit back to AI Boss OS.

## Responsibilities

AI Boss OS remains the command center, memory, project ledger, governance surface, mobile interface, and authority owner.

The Unified Orchestrator converts one outcome into an ordered multi-system workflow. It can coordinate steps across Gmail, Calendar, web, files, Desktop Commander, GitHub, GoHighLevel, Papa Life, Human Impact, and other target systems supported by the executive action queue.

The orchestrator does **not** bypass the executive action queue. Every step is created as a normal AI Boss OS executive action and therefore inherits:

- authority level
- approval requirements
- execution route selection
- provider/cost visibility
- action payload validation
- audit trail
- project/work-kind tracking
- connector/executor safety controls

## Authority mapping

The existing AI Boss OS authority model remains canonical:

- `observe`: read/search/analyze work that can proceed without external side effects when otherwise eligible.
- `act_reversible`: reversible actions; existing action-type rules may still require approval.
- `act_external`: external effects such as sending/publishing require approval.
- `sensitive`: sensitive work requires approval.

The orchestrator may make a workflow easier to coordinate, but it never weakens these rules.

## Dependencies

Each orchestration step has a stable `step_id` and optional `depends_on` list. The orchestrator:

1. validates that dependency IDs exist;
2. rejects self-dependencies and cycles;
3. creates actions in dependency order even when input steps are supplied out of order;
4. records dependency step IDs and resulting executive action IDs inside `_orchestrator` metadata;
5. exposes a dependency gate used by orchestrated execution so a downstream step cannot run until prerequisite actions are completed.

## Example

A Papa Life follow-up workflow can be represented as:

1. Search Gmail for replies (`observe`, automatic when eligible).
2. Analyze or organize the relevant response (`observe` / local model as configured).
3. Prepare a follow-up action linked to the Papa Life project.
4. Send the message (`act_external`, approval required).
5. Update the CRM or create the next follow-up task according to its own authority requirements.

The user experiences this as one AI Boss OS outcome while the orchestrator coordinates the underlying steps.

## Implementation

- `server/unified-orchestrator.ts` — planning, graph validation, queue enrollment, orchestration metadata, dependency checks.
- `server/unified-orchestrator-executor.ts` — execution wrapper that enforces orchestration dependencies before delegating to the existing AI Boss OS executive action executor.
- `server/unified-orchestrator.test.ts` — authority, sequencing, metadata, and cycle tests.

## Safety rule

**No production data, customer data, messages, publishing, deletion, purchase, or consequential external action receives new authority merely because it belongs to an orchestration.** Existing AI Boss OS governance remains the controlling layer.
