import type { FetchLike } from "../src";

export interface FakeReply {
  status: number;
  /** JSON-encoded as the response body. */
  body?: unknown;
  /** Sent verbatim instead of `body`. */
  raw?: string;
}

export interface RecordedRequest {
  url: string;
  method: string;
  headers: Headers;
  /** The raw request body, undefined when none was sent. */
  body: string | undefined;
}

/** A fetch stub that answers with `replies` in order and records every request it gets. */
export function fakeFetch(replies: FakeReply[]): { fetch: FetchLike; requests: RecordedRequest[] } {
  const queue = [...replies];
  const requests: RecordedRequest[] = [];
  const fetch: FetchLike = async (input, init = {}) => {
    requests.push({
      url: input,
      method: init.method ?? "GET",
      headers: new Headers(init.headers),
      body: typeof init.body === "string" ? init.body : undefined,
    });
    const reply = queue.shift();
    if (!reply) throw new Error(`Unexpected request #${requests.length}: ${init.method} ${input}`);
    const text = reply.raw ?? (reply.body === undefined ? "" : JSON.stringify(reply.body));
    return new Response(text, { status: reply.status, headers: { "Content-Type": "application/json" } });
  };
  return { fetch, requests };
}
