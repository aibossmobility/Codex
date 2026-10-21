# Worker deliverables and evidence hardening (October 20, 2026)

## Defect
Previously the relay accepted a boolean completion claim with only a role label. Generic read-only agents could be marked complete even when the owner's actual requested video, message, saved description or report was not produced.

## Prepared changes
- Cloud worker result API refuses boolean-only completion; only a scoped, leased outcome of completed with evidence list and summary or a blocked outcome with reason and next step is accepted.
- Unfulfilled work becomes a failed queue status with an explanation (Needs follow-up in UI), never completed.
- The authenticated Approvals & Queue screen lists 20 recent mobile assignments, revealing prior review-only results as unverified.
- The Mac outbound poller reads the local task's actual output and refuses success without evidence.
- The SEO worker uses a fixed allowlist of owned pages, saves a local file on the Mac, and returns HTTP-status evidence for the phone.
- Sends, YouTube changes, recording, paid model calls, external writes are not permitted by the read-only worker.
- Historical assignments #1 through #5 remain unmodified.

## Local verification
TypeScript, node worker regression tests, mobile directory audit, Mac candidate syntax, production build, and manual no-cost URL audit passed.

## Coordinated release requires explicit owner publishing approval
1. Create PR on existing GitHub repo, await CI, merge to deploy through existing Railway. Normal hosting/build usage may apply.
2. Ensure no worker tasks are in execution, then backup and install staged Mac agent and skill into ~/.ai-boss-os/bin.
3. Copy staged Mac poller and evidence validator into the launchd relay WorkingDirectory, preserving tokens and local queue DB. Verify and resume worker process.
4. Queue, approve and verify one read-only SEO assignment from Android; inspect proof on Approvals & Queue. Confirm unsupported work is blocked rather than completed.
5. Do not perform unsupported external actions without separately approved credentials and worker capabilities.
No live deployment, account, payment, subscription, or token changes occurred during preparation.
