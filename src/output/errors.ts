import { ApiError, ValidationError } from "@fal-ai/client";

export class AxiError extends Error {
  constructor(
    message: string,
    readonly suggestion: string,
    readonly exitCode: 1 | 2,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AxiError";
  }
}

export class UsageError extends AxiError {
  constructor(message: string, suggestion: string, details?: unknown) {
    super(message, suggestion, 1, details);
    this.name = "UsageError";
  }
}

export class RuntimeError extends AxiError {
  constructor(message: string, suggestion: string, details?: unknown) {
    super(message, suggestion, 2, details);
    this.name = "RuntimeError";
  }
}

export function normalizeError(error: unknown): AxiError {
  if (error instanceof AxiError) return error;
  if (error instanceof ValidationError) {
    return new RuntimeError(
      `fal API validation error (${error.status}): ${error.message}`,
      "check the model input and retry",
      error.body,
    );
  }
  if (error instanceof ApiError) {
    return new RuntimeError(
      `fal API error (${error.status}): ${error.message}`,
      error.requestId
        ? `retry or inspect request ${error.requestId}`
        : "retry; check fal.ai service status if the error persists",
      error.body,
    );
  }
  const message = error instanceof Error ? error.message : String(error);
  return new RuntimeError(
    `unexpected failure: ${message}`,
    "retry with the same arguments; report the failure if it persists",
  );
}
