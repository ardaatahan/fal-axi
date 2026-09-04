---
name: fal-axi
description: "Safe, agent-ergonomic fal.ai generation and queue access"
---

# fal-axi

Safe, agent-ergonomic fal.ai generation and queue access (AXI spec axi/1.0-2026-07). Install from a checkout with `npm install && npm run build && npm link`; without linking, use `node bin/fal-axi.js`. Authentication is exclusively through the `FAL_KEY` environment variable.

```
capabilities[4]{group,operations,safety}:
 models,list,local verified catalog; no key required
 image,generate,paid write; requires --confirm
 video,generate,paid write; requires --confirm
 job,"status,result",read-only; requires FAL_KEY
help[3]:
 fal-axi models list
 fal-axi image generate "a red fox in snow" --confirm
 fal-axi --help
```

Generation spends money and always requires `--confirm`. Use the exact model and request ID returned by generation with `job status` and `job result`. Every command supports `--help`; data commands support `--json`.

Exit codes: 0 success, 1 usage/configuration/validation error, 2 runtime or fal API error. Default output is compact TOON on stdout.
