import { emitBlock, emitList } from "../output/toon.js";

export const DESCRIPTION =
  "Safe, agent-ergonomic fal.ai generation and queue access";
export const SPEC_VERSION = "axi/1.0-2026-07";

export function homeData(): {
  capabilities: Array<Record<string, string>>;
  help: string[];
} {
  return {
    capabilities: [
      {
        group: "models",
        operations: "list",
        safety: "local verified catalog; no key required",
      },
      {
        group: "image",
        operations: "generate",
        safety: "paid write; requires --confirm",
      },
      {
        group: "video",
        operations: "generate",
        safety: "paid write; requires --confirm",
      },
      {
        group: "job",
        operations: "status,result",
        safety: "read-only; requires FAL_KEY",
      },
    ],
    help: [
      "fal-axi models list",
      'fal-axi image generate "a red fox in snow" --confirm',
      "fal-axi --help",
    ],
  };
}

export function homeBody(): string {
  const data = homeData();
  return [
    emitList("capabilities", data.capabilities, [
      "group",
      "operations",
      "safety",
    ]),
    emitBlock("help", data.help),
  ].join("\n");
}

export function rootHelpText(): string {
  return [
    `fal-axi: ${DESCRIPTION}`,
    emitList(
      "commands",
      [
        {
          command: "models list",
          summary: "List endpoints verified in official fal docs",
        },
        {
          command: "image generate <prompt>",
          summary: "Submit paid FLUX.1 dev image generation",
        },
        {
          command: "video generate <prompt>",
          summary: "Submit paid LTX 2.3 Fast video generation",
        },
        {
          command: "job status <model> <request-id>",
          summary: "Fetch queue status and logs",
        },
        {
          command: "job result <model> <request-id>",
          summary: "Fetch completed output",
        },
      ],
      ["command", "summary"],
    ),
    emitList(
      "flags",
      [
        { flag: "--help", description: "show command help" },
        { flag: "--json", description: "emit JSON instead of compact TOON" },
        { flag: "--version", description: "print package version" },
      ],
      ["flag", "description"],
    ),
    emitBlock("examples", homeData().help),
  ].join("\n");
}

export function renderSkill(): string {
  const frontmatter = [
    "---",
    "name: fal-axi",
    `description: "${DESCRIPTION}"`,
    "---",
  ].join("\n");
  const body = [
    "# fal-axi",
    "",
    `${DESCRIPTION} (AXI spec ${SPEC_VERSION}). Install from a checkout with \`npm install && npm run build && npm link\`; without linking, use \`node bin/fal-axi.js\`. Authentication is exclusively through the \`FAL_KEY\` environment variable.`,
    "",
    "```",
    homeBody(),
    "```",
    "",
    "Generation spends money and always requires `--confirm`. Use the exact model and request ID returned by generation with `job status` and `job result`. Every command supports `--help`; data commands support `--json`.",
    "",
    "Exit codes: 0 success, 1 usage/configuration/validation error, 2 runtime or fal API error. Default output is compact TOON on stdout.",
    "",
  ].join("\n");
  return `${frontmatter}\n\n${body}`;
}
