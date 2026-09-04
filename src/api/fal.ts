import { createFalClient, type QueueStatus } from "@fal-ai/client";
import { UsageError } from "../output/errors.js";

export interface FalApi {
  submit(
    model: string,
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  status(model: string, requestId: string): Promise<QueueStatus>;
  result(
    model: string,
    requestId: string,
  ): Promise<{ data: unknown; requestId: string }>;
}

export function requireFalKey(): string {
  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    throw new UsageError(
      "FAL_KEY is required",
      "export FAL_KEY='<your fal API key>' and retry",
    );
  }
  return key;
}

export function validateEndpointId(model: string): void {
  if (!/^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._/-]*$/i.test(model)) {
    throw new UsageError(
      `invalid model endpoint '${model}'`,
      "use an endpoint ID such as fal-ai/flux/dev",
    );
  }
}

export function validateRequestId(requestId: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(requestId)) {
    throw new UsageError(
      `invalid request ID '${requestId}'`,
      "copy request_id exactly from a fal queue submission",
    );
  }
}

export function createApi(): FalApi {
  const key = requireFalKey();
  const client = createFalClient({
    credentials: key,
    fetch: (input, init) => globalThis.fetch(input, init),
  });
  return {
    async submit(model, input) {
      validateEndpointId(model);
      return (await client.queue.submit(model, { input })) as unknown as Record<
        string,
        unknown
      >;
    },
    async status(model, requestId) {
      validateEndpointId(model);
      validateRequestId(requestId);
      return client.queue.status(model, { requestId, logs: true });
    },
    async result(model, requestId) {
      validateEndpointId(model);
      validateRequestId(requestId);
      return client.queue.result(model, { requestId });
    },
  };
}
