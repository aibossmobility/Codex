# AI Boss OS executive memory

This private foundation gives AI Boss OS structured continuity across conversations and operator channels without treating raw chat history as trusted long-term memory.

## Memory rules

- Each durable fact, decision, preference, commitment, project state, or relationship context uses a stable `canonical_key`.
- Saving the same key creates a new version and marks the prior version `superseded`; history is never silently overwritten.
- Every memory carries category, context, source reference, sensitivity, confidence, and effective time.
- Passwords, access tokens, private keys, and other credentials must never be stored as executive memory.
- The interface and API require the existing Brian-only Research Lab authorization.

## Conversation briefs

Conversation briefs hold structured continuity from ChatGPT, Gmail, Calendar, web research, files, Desktop Commander, GitHub, GHL, and other authorized channels. They store a summary, Brian's intent, the next action, and current status—not a full transcript.

## Private surface

- UI: `/executive-memory`
- `GET|POST /api/admin/executive-memory`
- `GET /api/admin/executive-memory/:key/history`
- `POST /api/admin/executive-memory/:id/archive`
- `GET|POST /api/admin/executive-conversations`

This slice records continuity only. It does not execute email, calendar, desktop, GitHub, or GHL actions. Connector-aware authority and execution controls are the next layer.
