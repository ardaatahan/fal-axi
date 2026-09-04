import { createRequire } from "node:module";
import type { CommandModule } from "../cli/router.js";
import { booleanFlag } from "../cli/args.js";
import { print } from "../output/toon.js";
import {
  DESCRIPTION,
  homeBody,
  homeData,
  rootHelpText,
} from "../skill/content.js";

const { version } = createRequire(import.meta.url)("../../package.json") as {
  version: string;
};

export const homeCommand: CommandModule = {
  spec: {
    name: "",
    summary: DESCRIPTION,
    flags: [
      {
        name: "version",
        type: "boolean",
        description: "print package version",
      },
      {
        name: "json",
        type: "boolean",
        description: "emit JSON instead of compact TOON",
      },
    ],
    examples: ["fal-axi", "fal-axi --version", "fal-axi --json"],
  },
  run(parsed) {
    if (booleanFlag(parsed, "version")) {
      print(
        booleanFlag(parsed, "json")
          ? JSON.stringify({ name: "fal-axi", version }, null, 2)
          : `fal-axi: ${version}`,
      );
      return 0;
    }
    print(
      booleanFlag(parsed, "json")
        ? JSON.stringify(homeData(), null, 2)
        : [`fal-axi: ${DESCRIPTION}`, homeBody()].join("\n"),
    );
    return 0;
  },
};

export function rootHelp(): string {
  return rootHelpText();
}
