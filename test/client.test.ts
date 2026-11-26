// Focused unit tests for behavior the shared contract cases don't cover.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import TryItOnDefault, { HAIRCUTS, TryItOn, TryItOnError, VERSION, type FetchLike } from "../src";
import { fakeFetch } from "./helpers";

function caught(promise: Promise<unknown>): Promise<TryItOnError> {
  return promise.then(
    () => {
      throw new Error("expected a TryItOnError");
    },
    (e: unknown) => {
      expect(e).toBeInstanceOf(TryItOnError);
      return e as TryItOnError;
    },
  );
}

const processing = { status: 200, body: { ok: true, status: "processing", output: [], error: null } };

describe("VERSION", () => {
  it("equals package.json's version", () => {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    expect(VERSION).toBe(pkg.version);
  });
});

describe("exports", () => {
  it("keeps the default export, HAIRCUTS and the error class", () => {
    expect(TryItOnDefault).toBe(TryItOn);
    expect(HAIRCUTS).toContain("BuzzCut");
    expect(new TryItOnError("x")).toBeInstanceOf(Error);
  });
});

describe("constructor", () => {
  it("rejects a missing apiKey with ConfigError", () => {
    for (const options of [undefined, {}, { apiKey: "" }]) {
      try {
        new TryItOn(options as any);
        throw new Error("expected a throw");
      } catch (e) {
        expect(e).toBeInstanceOf(TryItOnError);
        expect((e as TryItOnError).errorName).toBe("ConfigError");
        expect((e as TryItOnError).status).toBeNull();
      }
    }
  });

  it("strips a trailing slash from baseUrl", async () => {
    const fake = fakeFetch([{ status: 200, body: { ok: true, credits: {} } }]);
    await new TryItOn({ apiKey: "k", baseUrl: "https://api.test/v1/", fetch: fake.fetch }).getCredits();
    expect(fake.requests[0].url).toBe("https://api.test/v1/credits");
  });
});

describe("request", () => {
  it("times out with errorName Timeout", async () => {
    // Never resolves on its own; rejects like real fetch when the SDK aborts.
    const hang: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      });
    const client = new TryItOn({ apiKey: "k", timeoutMs: 5, fetch: hang });
    const err = await caught(client.getCredits());
    expect(err.errorName).toBe("Timeout");
    expect(err.status).toBeNull();
  });

  it("wraps a network failure as NetworkError", async () => {
    const fail: FetchLike = async () => {
      throw new TypeError("fetch failed");
    };
    const err = await caught(new TryItOn({ apiKey: "k", fetch: fail }).getCredits());
    expect(err.errorName).toBe("NetworkError");
    expect(err.message).toBe("Network error: fetch failed");
  });

  it("falls back to HTTP <status> for a whitespace-only error body", async () => {
    const fake = fakeFetch([{ status: 503, raw: " \n" }]);
    const err = await caught(new TryItOn({ apiKey: "k", fetch: fake.fetch }).getCredits());
    expect(err.message).toBe("HTTP 503");
    expect(err.status).toBe(503);
  });
});

describe("waitForResult", () => {
  it("still reads an object-shaped job error", async () => {
    const fake = fakeFetch([
      { status: 200, body: { ok: true, status: "failed", error: { name: "ModerationError", message: "Blocked." } } },
    ]);
    const err = await caught(new TryItOn({ apiKey: "k", fetch: fake.fetch }).waitForResult("j"));
    expect(err.errorName).toBe("ModerationError");
    expect(err.message).toBe("Blocked.");
  });

  it("uses a generic message when a failed job has no reason", async () => {
    const fake = fakeFetch([{ status: 200, body: { ok: true, status: "failed", output: [], error: null } }]);
    const err = await caught(new TryItOn({ apiKey: "k", fetch: fake.fetch }).waitForResult("j"));
    expect(err.errorName).toBe("ProcessingError");
    expect(err.message).toBe("Try-on failed.");
  });

  it("gives up with errorName Timeout", async () => {
    const fake = fakeFetch([processing, processing, processing, processing]);
    const client = new TryItOn({ apiKey: "k", fetch: fake.fetch });
    const err = await caught(client.waitForResult("j", { pollIntervalMs: 5, timeoutMs: 1 }));
    expect(err.errorName).toBe("Timeout");
  });

  it("stops with errorName Aborted when the signal fires", async () => {
    const fake = fakeFetch([processing]);
    const controller = new AbortController();
    controller.abort();
    const client = new TryItOn({ apiKey: "k", fetch: fake.fetch });
    const err = await caught(client.waitForResult("j", { pollIntervalMs: 0, signal: controller.signal }));
    expect(err.errorName).toBe("Aborted");
  });
});
