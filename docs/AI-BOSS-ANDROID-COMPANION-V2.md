# AI Boss OS — Android Companion v2

## Purpose

Keep AI Boss OS usable from Brian's Android phone or tablet when the California Mac is offline.

## Operating model

- Android is a secure companion node, not an unrestricted remote shell.
- The phone can report online status, capture instructions, review pending approvals, and approve or decline queued actions.
- Direct/cloud-capable work may continue without the Mac when the configured executor supports it.
- Actions that require local Mac files, local credentials, Desktop Commander, or other Mac-only resources remain in `waiting_for_mac` and must not be falsely marked executable.
- Consequential actions continue to use the existing authority/approval queue.
- No SSH private keys, provider secrets, or production credentials are copied into the browser or stored in localStorage.

## Companion capabilities

The Android heartbeat advertises:

- `mobile_capture`
- `approvals`
- `instruction_queue`
- `mission_control`
- `phone_primary_when_mac_offline`

## Safety boundary

Phone approval is authorization, not credential substitution. If an approved action needs a secret or resource that only exists on the Mac, AI Boss OS records the approval and waits for the Mac rather than bypassing the missing dependency.

## Next implementation slice

1. Surface pending approval details in Mobile Mission Control.
2. Add approve/decline controls using the existing `/api/admin/action-queue/:id/decision` authority endpoint.
3. Mark Android as the active companion in Mission Control while its heartbeat is fresh.
4. Preserve `waiting_for_mac` for local-route work whenever no Mac node is online.
5. Add tests for offline-Mac + online-Android behavior.
