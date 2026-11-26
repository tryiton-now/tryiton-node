import { TryItOnError } from "./errors";
import type { FetchLike } from "./types";
import { VERSION } from "./version";

export type HttpMethod = "GET" | "POST";

export interface HttpConfig {
  apiKey: string;
  /** Without a trailing slash. */
  baseUrl: string;
  timeoutMs: number;
  fetchImpl: FetchLike;
}

// Browsers ignore a custom User-Agent in fetch; servers (Node, Bun, Deno) send it.
const USER_AGENT = `tryiton-node/${VERSION}`;

/**
 * Send one API request and return the parsed JSON body.
 * Throws TryItOnError on a network failure, a timeout or any non-2xx response.
 */
export async function request<T>(config: HttpConfig, method: HttpMethod, path: string, body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  let res: Response;
  try {
    res = await config.fetchImpl(`${config.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "User-Agent": USER_AGENT,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(stripUndefined(body)) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") {
      throw new TryItOnError(`Request timed out after ${config.timeoutMs}ms.`, { errorName: "Timeout" });
    }
    throw new TryItOnError(`Network error: ${(err as Error)?.message ?? String(err)}`, { errorName: "NetworkError" });
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let data: any = {};
  if (text.trim()) {
    try {
      data = JSON.parse(text);
    } catch {
      // A proxy or gateway page (HTML, plain text) instead of the API's JSON.
      if (!res.ok) throw new TryItOnError(text, { status: res.status });
    }
  }

  if (!res.ok) throw apiError(res.status, data);
  return data as T;
}

/** Build the error for a non-2xx JSON response. */
export function apiError(status: number, data: any): TryItOnError {
  // API envelope: { ok: false, error: { name, message } }. Older shapes put strings at the top level.
  const envelope = data?.error && typeof data.error === "object" ? data.error : null;
  return new TryItOnError(envelope?.message ?? data?.message ?? `HTTP ${status}`, {
    status,
    errorName: envelope?.name ?? (typeof data?.error === "string" ? data.error : null),
  });
}

/** Drop top-level `undefined` values so unset options are left out of the JSON body. */
export function stripUndefined(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") return obj;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}
