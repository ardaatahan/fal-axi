import { dispatch, type Registry } from "./cli/router.js";
import { allCommands } from "./commands/fal.js";
import { homeCommand, rootHelp } from "./commands/home.js";

const registry: Registry = {
  tool: "fal-axi",
  root: homeCommand,
  rootHelp,
  commands: allCommands,
};

process.exitCode = await dispatch(registry, process.argv.slice(2));
