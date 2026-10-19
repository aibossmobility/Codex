# Digital Brian within Papa Life OS — cost boundary
2026-10-19

## Principle
Digital Brian is a guide in Papa Life OS, not an extra subscription prerequisite for using Mac workers. Existing owner session, assignment approvals, Mac outbound relay, and local read-only worker safeguards remain independent of Digital Brian.

## No-model-cost experience
- The private Papa Life OS Digital Brian guide has fixed local answers and links to the existing worker assignment, approvals, directory, and work reports pages.
- The public Digital Brian page has prepared fatherhood answers and links to lessons, the PAPA framework, and digital courses.
- Neither prepared guide makes an AI-model request. The existing /api/ai/chat public assistant now defaults to the local response engine even if an API credential exists.
- Paid text-model calls through that engine require explicit owner-supplied PAPA_LIFE_PAID_CHAT_ENABLED=true, not just an API key.
- The owner may still pay normal website, data transport, and hosting usage on Railway. “No-model-cost” does not mean cost-free hosting.
- Existing unrelated app integrations may have separate vendor usage costs and are not covered by this specific AI guard.

## Optional ElevenLabs voice
- The ElevenLabs widget is not loaded on the public Digital Twin page or inside the private Papa Life OS guide until the visitor explicitly selects the voice panel.
- The widget itself still requires pressing Start Voice Conversation.
- ElevenLabs conversation usage may consume plan credits; this integration does not cancel ElevenLabs or change its subscription.
- The voice widget does not route, approve, or execute worker assignments.

## Safety boundaries
- Digital Brian identifies itself as a guide, not Brian himself.
- Prepared answers do not claim personal review by Brian or imply a message was sent.
- Authentication is still required for owner OS and approvals, and existing independent approval is required for worker dispatch.

## Publish checklist
- Test TypeScript, web build, worker intake, relay, and public AI cost guard locally.
- Review PR and run GitHub build checks before merge.
- If the owner approves live deployment and normal existing-service build usage, publish via GitHub main -> Railway and verify no auto-started voice sessions.
