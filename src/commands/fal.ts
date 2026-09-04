import {
  booleanFlag,
  stringFlag,
  type Parsed,
} from "../cli/args.js";
import type { CommandModule } from "../cli/router.js";
import { createApi } from "../api/fal.js";
import { UsageError } from "../output/errors.js";
import { emitList, formatOutput, print } from "../output/toon.js";

export const IMAGE_MODEL = "fal-ai/flux/dev";
export const VIDEO_MODEL = "fal-ai/ltx-2.3/text-to-video/fast";

export const knownModels = [
  {
    id: IMAGE_MODEL,
    kind: "text-to-image",
    command: "image generate",
    docs: "https://fal.ai/models/fal-ai/flux/dev/api",
  },
  {
    id: VIDEO_MODEL,
    kind: "text-to-video",
    command: "video generate",
    docs: "https://fal.ai/models/fal-ai/ltx-2.3/text-to-video/fast/api",
  },
] as const;

function integerFlag(
  parsed: Parsed,
  name: string,
  options: { min?: number; max?: number } = {},
): number | undefined {
  const raw = stringFlag(parsed, name);
  if (raw === undefined) return undefined;
  if (!/^-?\d+$/.test(raw)) {
    throw new UsageError(`--${name} must be an integer`, `received: ${raw}`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value)) {
    throw new UsageError(
      `--${name} must be a safe integer`,
      `received: ${raw}`,
    );
  }
  if (options.min !== undefined && value < options.min) {
    throw new UsageError(
      `--${name} must be at least ${options.min}`,
      `received: ${raw}`,
    );
  }
  if (options.max !== undefined && value > options.max) {
    throw new UsageError(
      `--${name} must be at most ${options.max}`,
      `received: ${raw}`,
    );
  }
  return value;
}

function requirePrompt(parsed: Parsed, kind: "image" | "video"): string {
  const prompt = parsed.positionals[0]!;
  if (!prompt.trim()) {
    throw new UsageError(
      `${kind} prompt must not be empty`,
      "provide a non-empty <prompt>",
    );
  }
  return prompt;
}

function requireConfirmation(parsed: Parsed, kind: "image" | "video"): void {
  if (!booleanFlag(parsed, "confirm")) {
    throw new UsageError(
      `confirmation required for paid ${kind} generation`,
      `review the model and prompt, then rerun with --confirm`,
    );
  }
}

function output(parsed: Parsed, value: unknown): void {
  print(formatOutput(value, booleanFlag(parsed, "json")));
}

const outputFlags = [
  {
    name: "json",
    type: "boolean",
    description: "emit JSON instead of compact TOON",
  },
] as const;

export const modelsList: CommandModule = {
  spec: {
    name: "models list",
    summary: "List the model endpoints verified against official fal docs",
    flags: [...outputFlags],
    examples: ["fal-axi models list", "fal-axi models list --json"],
  },
  run(parsed) {
    if (booleanFlag(parsed, "json")) {
      print(JSON.stringify({ models: knownModels }, null, 2));
    } else {
      print(
        emitList(
          "models",
          knownModels.map((model) => ({ ...model })),
          ["id", "kind", "command", "docs"],
        ),
      );
    }
    return 0;
  },
};

export const imageGenerate: CommandModule = {
  spec: {
    name: "image generate",
    summary: "Submit a paid FLUX.1 dev text-to-image request",
    args: [
      {
        name: "prompt",
        required: true,
        description: "text describing the image",
      },
    ],
    flags: [
      {
        name: "model",
        type: "string",
        default: IMAGE_MODEL,
        values: [IMAGE_MODEL],
        description: "verified fal image endpoint",
      },
      {
        name: "image-size",
        type: "string",
        values: [
          "square_hd",
          "square",
          "portrait_4_3",
          "portrait_16_9",
          "landscape_4_3",
          "landscape_16_9",
        ],
        description: "documented output size",
      },
      {
        name: "num-images",
        type: "string",
        description: "number of images (1-4)",
      },
      { name: "seed", type: "string", description: "integer random seed" },
      {
        name: "output-format",
        type: "string",
        values: ["jpeg", "png"],
        description: "image encoding",
      },
      {
        name: "confirm",
        type: "boolean",
        description: "authorize this paid generation request",
      },
      ...outputFlags,
    ],
    examples: [
      'fal-axi image generate "a red fox in snow" --confirm',
      'fal-axi image generate "diagram" --image-size square --output-format png --confirm --json',
    ],
  },
  async run(parsed) {
    const prompt = requirePrompt(parsed, "image");
    const model = stringFlag(parsed, "model") ?? IMAGE_MODEL;
    const numImages = integerFlag(parsed, "num-images", { min: 1, max: 4 });
    const seed = integerFlag(parsed, "seed");
    requireConfirmation(parsed, "image");
    const input: Record<string, unknown> = { prompt };
    const imageSize = stringFlag(parsed, "image-size");
    const outputFormat = stringFlag(parsed, "output-format");
    if (imageSize) input.image_size = imageSize;
    if (numImages !== undefined) input.num_images = numImages;
    if (seed !== undefined) input.seed = seed;
    if (outputFormat) input.output_format = outputFormat;
    const response = await createApi().submit(model, input);
    output(parsed, {
      ...response,
      operation: "image.generate",
      model,
      next: `fal-axi job status ${model} ${String(response.request_id)}`,
    });
    return 0;
  },
};

export const videoGenerate: CommandModule = {
  spec: {
    name: "video generate",
    summary: "Submit a paid LTX 2.3 Fast text-to-video request",
    args: [
      {
        name: "prompt",
        required: true,
        description: "text describing the video",
      },
    ],
    flags: [
      {
        name: "model",
        type: "string",
        default: VIDEO_MODEL,
        values: [VIDEO_MODEL],
        description: "verified fal video endpoint",
      },
      {
        name: "duration",
        type: "string",
        values: ["6", "8", "10", "12", "14", "16", "18", "20"],
        description: "duration in seconds",
      },
      {
        name: "resolution",
        type: "string",
        values: ["1080p", "1440p", "2160p"],
        description: "video resolution",
      },
      {
        name: "aspect-ratio",
        type: "string",
        values: ["16:9", "9:16"],
        description: "video aspect ratio",
      },
      {
        name: "fps",
        type: "string",
        values: ["24", "25", "48", "50"],
        description: "frames per second",
      },
      {
        name: "no-audio",
        type: "boolean",
        description: "disable generated audio",
      },
      {
        name: "confirm",
        type: "boolean",
        description: "authorize this paid generation request",
      },
      ...outputFlags,
    ],
    examples: [
      'fal-axi video generate "a paper boat crossing a puddle" --confirm',
      'fal-axi video generate "vertical product shot" --duration 8 --aspect-ratio 9:16 --confirm --json',
    ],
  },
  async run(parsed) {
    const prompt = requirePrompt(parsed, "video");
    const model = stringFlag(parsed, "model") ?? VIDEO_MODEL;
    const duration = integerFlag(parsed, "duration");
    const fps = integerFlag(parsed, "fps");
    const resolution = stringFlag(parsed, "resolution");
    if (
      duration !== undefined &&
      duration > 10 &&
      ((fps !== undefined && fps !== 25) ||
        (resolution !== undefined && resolution !== "1080p"))
    ) {
      throw new UsageError(
        "durations over 10 seconds require 25 FPS and 1080p",
        "use --fps 25 --resolution 1080p or a duration of 10 seconds or less",
      );
    }
    requireConfirmation(parsed, "video");
    const input: Record<string, unknown> = { prompt };
    if (duration !== undefined) input.duration = duration;
    if (resolution) input.resolution = resolution;
    const aspectRatio = stringFlag(parsed, "aspect-ratio");
    if (aspectRatio) input.aspect_ratio = aspectRatio;
    if (fps !== undefined) input.fps = fps;
    if (booleanFlag(parsed, "no-audio")) input.generate_audio = false;
    const response = await createApi().submit(model, input);
    output(parsed, {
      ...response,
      operation: "video.generate",
      model,
      next: `fal-axi job status ${model} ${String(response.request_id)}`,
    });
    return 0;
  },
};

function jobCommand(
  operation: "status" | "result",
): CommandModule {
  return {
    spec: {
      name: `job ${operation}`,
      summary:
        operation === "status"
          ? "Fetch queue status and logs for a fal request"
          : "Fetch the completed result for a fal request",
      args: [
        {
          name: "model",
          required: true,
          description: "model endpoint used to submit the request",
        },
        {
          name: "request-id",
          required: true,
          description: "request_id returned by fal",
        },
      ],
      flags: [...outputFlags],
      examples: [
        `fal-axi job ${operation} ${IMAGE_MODEL} 764cabcf-b745-4b3e-ae38-1200304cf45b`,
      ],
    },
    async run(parsed) {
      const [model, requestId] = parsed.positionals as [string, string];
      const api = createApi();
      if (operation === "status") {
        const response = await api.status(model, requestId);
        output(parsed, { model, ...response });
      } else {
        const response = await api.result(model, requestId);
        output(parsed, {
          model,
          request_id: response.requestId || requestId,
          result: response.data,
        });
      }
      return 0;
    },
  };
}

export const jobStatus = jobCommand("status");
export const jobResult = jobCommand("result");

export const allCommands: Record<string, CommandModule> = {
  "models list": modelsList,
  "image generate": imageGenerate,
  "video generate": videoGenerate,
  "job status": jobStatus,
  "job result": jobResult,
};
