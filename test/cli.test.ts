import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dispatch, type Registry } from "../src/cli/router.js";
import { allCommands } from "../src/commands/fal.js";
import { homeCommand, rootHelp } from "../src/commands/home.js";
import { parseToon } from "../src/output/toon.js";

const registry: Registry = {
  tool: "fal-axi",
  root: homeCommand,
  rootHelp,
  commands: allCommands,
};
const bin = fileURLToPath(new URL("../bin/fal-axi.js", import.meta.url));

function child(...args: string[]) {
  return spawnSync("node", [bin, ...args], {
    encoding: "utf8",
    env: { ...process.env, FAL_KEY: "" },
  });
}

function response(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

let stdout = "";
beforeEach(() => {
  stdout = "";
  process.env.FAL_KEY = "test-id:test-secret";
  vi.spyOn(process.stdout, "write").mockImplementation(
    ((chunk: string | Uint8Array) => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete process.env.FAL_KEY;
});

describe("AXI shell contract", () => {
  it("shows compact help without credentials", () => {
    const home = child();
    expect(home.status).toBe(0);
    expect(home.stdout).toContain("capabilities[4]");
    expect(home.stderr).toBe("");

    const help = child("--help");
    expect(help.status).toBe(0);
    expect(help.stdout).toContain("image generate <prompt>");

    const commandHelp = child("image", "generate", "--help");
    expect(commandHelp.status).toBe(0);
    expect(commandHelp.stdout).toContain("--confirm");
  });

  it("uses exit 1 for confirmation and configuration failures", () => {
    const unconfirmed = child("image", "generate", "test");
    expect(unconfirmed.status).toBe(1);
    expect(unconfirmed.stdout).toContain("confirmation required");

    const missingKey = child("image", "generate", "test", "--confirm");
    expect(missingKey.status).toBe(1);
    expect(missingKey.stdout).toContain("FAL_KEY is required");
  });

  it("emits JSON only when requested and TOON by default", async () => {
    expect(await dispatch(registry, ["models", "list"])).toBe(0);
    expect(parseToon(stdout.trim()).ok).toBe(true);
    expect(stdout).toContain("models[2]");

    stdout = "";
    expect(await dispatch(registry, ["models", "list", "--json"])).toBe(0);
    expect(() => JSON.parse(stdout)).not.toThrow();
    expect(JSON.parse(stdout).models).toHaveLength(2);
  });

  it("uses exit 1 for unknown commands and flags", () => {
    expect(child("unknown").status).toBe(1);
    expect(child("models", "list", "--wat").status).toBe(1);
  });
});

describe("official fal queue client integration with mocked HTTP", () => {
  it("submits documented FLUX input with environment-only header auth", async () => {
    let observedUrl = "";
    let observedInit: RequestInit | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        observedUrl = String(input);
        observedInit = init;
        return response({
          status: "IN_QUEUE",
          request_id: "image-request",
          queue_position: 0,
          response_url: "https://queue.fal.run/result",
          status_url: "https://queue.fal.run/status",
          cancel_url: "https://queue.fal.run/cancel",
        });
      }),
    );

    const code = await dispatch(registry, [
      "image",
      "generate",
      "a red fox",
      "--image-size",
      "square",
      "--num-images",
      "2",
      "--seed",
      "42",
      "--output-format",
      "png",
      "--confirm",
    ]);
    expect(code).toBe(0);
    expect(observedUrl).toBe("https://queue.fal.run/fal-ai/flux/dev");
    expect(observedInit?.method).toBe("POST");
    expect(observedInit?.headers).toMatchObject({
      Authorization: "Key test-id:test-secret",
    });
    expect(JSON.parse(String(observedInit?.body))).toEqual({
      prompt: "a red fox",
      image_size: "square",
      num_images: 2,
      seed: 42,
      output_format: "png",
    });
    expect(String(observedInit?.body)).not.toContain("test-secret");
    expect(stdout).toContain("request_id: image-request");
  });

  it("submits the documented LTX video shape", async () => {
    let body: unknown;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
        body = JSON.parse(String(init?.body));
        return response({
          status: "IN_QUEUE",
          request_id: "video-request",
          queue_position: 1,
          response_url: "result",
          status_url: "status",
          cancel_url: "cancel",
        });
      }),
    );

    expect(
      await dispatch(registry, [
        "video",
        "generate",
        "paper boat",
        "--duration",
        "8",
        "--resolution",
        "1080p",
        "--aspect-ratio",
        "9:16",
        "--fps",
        "25",
        "--no-audio",
        "--confirm",
      ]),
    ).toBe(0);
    expect(body).toEqual({
      prompt: "paper boat",
      duration: 8,
      resolution: "1080p",
      aspect_ratio: "9:16",
      fps: 25,
      generate_audio: false,
    });
  });

  it("fetches status with logs and fetches a completed result", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        calls.push(url);
        if (url.endsWith("/status?logs=1")) {
          return response({
            status: "COMPLETED",
            request_id: "request_123",
            response_url: "result",
            status_url: "status",
            cancel_url: "cancel",
            logs: [],
          });
        }
        return response(
          { images: [{ url: "https://fal.media/example.png" }], seed: 7 },
          200,
          { "x-fal-request-id": "request_123" },
        );
      }),
    );

    expect(
      await dispatch(registry, [
        "job",
        "status",
        "fal-ai/flux/dev",
        "request_123",
      ]),
    ).toBe(0);
    stdout = "";
    expect(
      await dispatch(registry, [
        "job",
        "result",
        "fal-ai/flux/dev",
        "request_123",
        "--json",
      ]),
    ).toBe(0);

    expect(calls).toEqual([
      "https://queue.fal.run/fal-ai/flux/dev/requests/request_123/status?logs=1",
      "https://queue.fal.run/fal-ai/flux/dev/requests/request_123",
    ]);
    expect(JSON.parse(stdout).result.seed).toBe(7);
  });

  it("maps fal API failures to exit 2 without leaking credentials", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => response({ message: "unauthorized" }, 401)),
    );
    const code = await dispatch(registry, [
      "job",
      "status",
      "fal-ai/flux/dev",
      "request_123",
    ]);
    expect(code).toBe(2);
    expect(stdout).toContain("fal API error (401): unauthorized");
    expect(stdout).not.toContain("test-secret");
  });
});
