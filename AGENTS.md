# Project agent memory

- `README.md` is authoritative for commands, safety gates, verified model IDs,
  output, and exit codes. Keep it aligned with `src/commands/fal.ts`.
- Remote calls must use documented official fal surfaces through
  `@fal-ai/client`. Authentication is exclusively `process.env.FAL_KEY`; never
  add key flags, prompts, or credential-file lookup.
- Image and video generation are paid writes and must remain gated by
  `--confirm` before any network request.
- Validate changes with `npm test`, `npm run typecheck`, and
  `npm run skill:check`. CI and tests must pass without secrets; HTTP is mocked.
- `src/skill/content.ts` is the source for the root discovery view and
  `skills/fal-axi/SKILL.md`. Run `npm run build && npm run skill:gen` after
  changing it.

## Scope boundaries

Phase A implements only `fal-ai/flux/dev`,
`fal-ai/ltx-2.3/text-to-video/fast`, and queue submit/status/result. The
additional catalog, cancellation, webhooks, uploads, streaming, training, and
raw arbitrary payloads remain UNRESOLVED. Never imply broader model coverage.
