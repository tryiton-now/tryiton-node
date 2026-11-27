// Runs the shared SDK contract cases (test/fixtures/sdk-cases.json). That file is generated: edit
// tryiton/backend/api-contract/sdk-cases.json and run `node tryiton-sdk/sync-contract.mjs` instead.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TryItOn, TryItOnError, VERSION } from "../src";
import { fakeFetch, type FakeReply, type RecordedRequest } from "./helpers";

interface ExpectedError {
  status: number | null;
  errorName: string | null;
  message?: string;
  messageAnyOf?: string[];
}

interface MethodCase {
  name: string;
  method: string;
  params: Record<string, unknown>;
  responses: FakeReply[];
  expectRequests: { method: string; path: string; body?: unknown }[];
  expectResult?: unknown;
  expectResultIsResponseBody?: boolean;
  expectError?: ExpectedError;
}

interface ErrorCase {
  name: string;
  response: FakeReply;
  expectError: ExpectedError;
}

interface Contract {
  baseUrl: string;
  apiKey: string;
  authHeader: string;
  userAgent: { pattern: string };
  methodCases: MethodCase[];
  errorCases: ErrorCase[];
}

const contract: Contract = JSON.parse(readFileSync(new URL("./fixtures/sdk-cases.json", import.meta.url), "utf8"));

// Canonical method name → call on the client. The TS SDK uses the canonical names and param objects directly;
// methods that take a single id get it positionally.
const calls: Record<string, (client: TryItOn, p: any) => Promise<unknown>> = {
  tryOnFashion: (c, p) => c.tryOnFashion(p),
  tryOnHairstyle: (c, p) => c.tryOnHairstyle(p),
  tryOnTattoo: (c, p) => c.tryOnTattoo(p),
  getStatus: (c, p) => c.getStatus(p.jobId),
  getCredits: (c) => c.getCredits(),
  waitForResult: (c, p) => c.waitForResult(p.jobId, { pollIntervalMs: 0 }),
  getLiveConfig: (c) => c.getLiveConfig(),
  prepareLiveGarment: (c, p) => c.prepareLiveGarment(p),
  prepareLiveOutfit: (c, p) => c.prepareLiveOutfit(p),
  startLiveSession: (c, p) => c.startLiveSession(p),
  getLiveSession: (c, p) => c.getLiveSession(p.sessionId),
  stopLiveSession: (c, p) => c.stopLiveSession(p.sessionId),
};

function clientFor(replies: FakeReply[]) {
  const fake = fakeFetch(replies);
  const client = new TryItOn({ apiKey: contract.apiKey, baseUrl: contract.baseUrl, fetch: fake.fetch });
  return { client, requests: fake.requests };
}

function expectHeaders(req: RecordedRequest) {
  expect(req.headers.get("Authorization")).toBe(contract.authHeader);
  const ua = req.headers.get("User-Agent");
  expect(ua).toMatch(new RegExp(contract.userAgent.pattern));
  expect(ua).toBe(`tryiton-node/${VERSION}`);
}

async function expectTryItOnError(promise: Promise<unknown>, expected: ExpectedError) {
  const err = await promise.then(
    () => {
      throw new Error("expected the call to throw a TryItOnError");
    },
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(TryItOnError);
  const e = err as TryItOnError;
  expect(e.status).toBe(expected.status);
  expect(e.errorName).toBe(expected.errorName);
  if (expected.message !== undefined) expect(e.message).toBe(expected.message);
  if (expected.messageAnyOf) expect(expected.messageAnyOf).toContain(e.message);
}

/**
 * getStatus returns the whole API body, `ok` included (StatusResponse.ok is public), while the cases list only the
 * payload. Compare without the envelope's `ok` when the case leaves it out.
 */
function withoutUnlistedOk(result: unknown, expected: unknown): unknown {
  if (!result || typeof result !== "object" || Array.isArray(result)) return result;
  if (expected && typeof expected === "object" && "ok" in expected) return result;
  const { ok: _ok, ...rest } = result as Record<string, unknown>;
  return rest;
}

describe("contract: methodCases", () => {
  it("has a call for every method in the fixture", () => {
    const missing = contract.methodCases.map((c) => c.method).filter((m) => !(m in calls));
    expect(missing).toEqual([]);
  });

  for (const tc of contract.methodCases) {
    it(tc.name, async () => {
      const { client, requests } = clientFor(tc.responses);
      const call = calls[tc.method](client, tc.params);

      if (tc.expectError) {
        await expectTryItOnError(call, tc.expectError);
      } else {
        const result = await call;
        if (tc.expectResultIsResponseBody) {
          expect(result).toEqual(tc.responses[tc.responses.length - 1].body);
        } else {
          expect(withoutUnlistedOk(result, tc.expectResult)).toEqual(tc.expectResult);
        }
      }

      expect(requests).toHaveLength(tc.expectRequests.length);
      tc.expectRequests.forEach((want, i) => {
        const req = requests[i];
        expect(req.method).toBe(want.method);
        expect(req.url.startsWith(contract.baseUrl)).toBe(true);
        expect(req.url.slice(contract.baseUrl.length)).toBe(want.path);
        expectHeaders(req);
        if (want.method === "GET") expect(req.body).toBeUndefined();
        if (want.body !== undefined) {
          expect(req.headers.get("Content-Type")).toBe("application/json");
          expect(JSON.parse(req.body ?? "null")).toEqual(want.body);
        }
      });
    });
  }
});

describe("contract: errorCases", () => {
  const targets: [string, (c: TryItOn) => Promise<unknown>, string][] = [
    ["getCredits()", (c) => c.getCredits(), "/credits"],
    ['getLiveSession("s1")', (c) => c.getLiveSession("s1"), "/live/sessions/s1"],
  ];

  for (const [label, run, path] of targets) {
    for (const tc of contract.errorCases) {
      it(`${label}: ${tc.name}`, async () => {
        const { client, requests } = clientFor([tc.response]);
        await expectTryItOnError(run(client), tc.expectError);
        expect(requests).toHaveLength(1);
        expect(requests[0].url).toBe(`${contract.baseUrl}${path}`);
        expectHeaders(requests[0]);
      });
    }
  }
});
