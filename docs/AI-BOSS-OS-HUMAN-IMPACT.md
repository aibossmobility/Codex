# AI Boss OS human-impact layer

This private layer records whether AI-supported Papa Life guidance is followed by movement in five human domains:

1. reflection
2. decisions
3. communication
4. action
5. relationship outcomes

It uses paired `baseline` and `follow_up` observations on a 1–5 scale. The system summarizes average directional change and the number of participants who improved in each domain.

## Privacy and human review

- Use a pseudonymous `participant_ref`; do not submit a name or email address.
- Do not store conversation transcripts in this table.
- Every observation declares either `program_improvement` or `research_opt_in` consent scope.
- All endpoints require the existing private Research Lab administrator access.
- Results are directional learning signals, not clinical findings or proof that AI caused an outcome.
- This layer measures whether AI supported human reflection and connection; it does not automate sensitive messages to fathers or adult children.

## Private endpoints

- `POST /api/admin/human-impact/observations`
- `GET /api/admin/human-impact/observations`
- `GET /api/admin/human-impact/summary`

The observation contract intentionally rejects unknown fields, including direct PII fields such as `email`.
