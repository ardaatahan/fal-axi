# fal-axi

AXI-compliant, agent-ergonomic CLI for fal.ai generation and queue access.
Built against Spec `axi/1.0-2026-07`, Node.js 20+, TypeScript, and the official
[`@fal-ai/client`](https://www.npmjs.com/package/@fal-ai/client).

The package intentionally exposes a small verified surface: one documented
text-to-image model, one documented text-to-video model, and the official fal
queue status/result flow. It does not discover or guess model IDs.

## Install

```sh
npm install
npm run build
npm link
fal-axi --help
```

Without linking, run `node bin/fal-axi.js`.

## Authentication

Set `FAL_KEY` in the environment:

```sh
export FAL_KEY="key-id:key-secret"
```

`fal-axi` reads credentials only from `FAL_KEY`. It never reads credential
files, accepts keys as arguments, or prompts for a key. Help and `models list`
work without authentication.

## Commands

```sh
# Local catalog of endpoints verified against official fal model docs
fal-axi models list

# Paid asynchronous image generation
fal-axi image generate "a red fox in snow" --confirm
fal-axi image generate "a technical diagram" \
  --image-size square --num-images 2 --seed 42 --output-format png --confirm

# Paid asynchronous video generation
fal-axi video generate "a paper boat crossing a rain puddle" --confirm
fal-axi video generate "a vertical product shot" \
  --duration 8 --resolution 1080p --aspect-ratio 9:16 --fps 25 \
  --no-audio --confirm

# Read queue state or retrieve completed output
fal-axi job status fal-ai/flux/dev <request-id>
fal-axi job result fal-ai/flux/dev <request-id>
```

Use `--help` on any command for its exact arguments and documented option
values. Generation submits to the fal queue and returns immediately with a
`request_id`; it does not block waiting for generation.

### Verified models

| Model ID | Command | Official documentation |
| --- | --- | --- |
| `fal-ai/flux/dev` | `image generate` | [FLUX.1 dev API](https://fal.ai/models/fal-ai/flux/dev/api) |
| `fal-ai/ltx-2.3/text-to-video/fast` | `video generate` | [LTX 2.3 Fast text-to-video API](https://fal.ai/models/fal-ai/ltx-2.3/text-to-video/fast/api) |

These model pages document `fal.queue.submit`, `fal.queue.status`, and
`fal.queue.result`, which are the only remote operations used here.

## Safety gate

Image and video generation are paid writes. They refuse before network access
unless `--confirm` is present. `--confirm` authorizes one queue submission only;
there is no interactive confirmation and no remembered consent.

Queue status/result commands are read-only and do not require confirmation.

## Output

Compact TOON is the default:

```text
operation: image.generate
model: fal-ai/flux/dev
status: IN_QUEUE
request_id: 764cabcf-b745-4b3e-ae38-1200304cf45b
```

Add `--json` to data commands (or the root command) for JSON. Errors are also
JSON when `--json` is present. Output goes to stdout so agents can consume one
stream deterministically.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Success or informational help |
| `1` | Usage, local validation, missing confirmation, or missing `FAL_KEY` |
| `2` | Runtime, network, or fal API failure |

## Development

```sh
npm test
npm run typecheck
npm run skill:check
```

Tests mock HTTP at the official client boundary and never need a live
`FAL_KEY`.

## UNRESOLVED / intentionally not implemented

- The public fal catalog is much larger than the two endpoints verified here.
  Adding a model requires reviewing its current official model page and adding
  only its documented input fields.
- Request cancellation, webhooks, uploads, streaming, training, custom models,
  and arbitrary raw payload submission are not exposed in Phase A.
- Cost estimation is model/account dependent and is not available through the
  queue methods used here. `--confirm` is therefore an authorization gate, not
  a quoted-price confirmation.
