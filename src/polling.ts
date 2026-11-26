import { TryItOnError } from "./errors";
import type { StatusResponse } from "./types";

/** Resolve after `ms`, or reject with an "Aborted" TryItOnError when the signal fires. */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new TryItOnError("Aborted.", { errorName: "Aborted" }));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new TryItOnError("Aborted.", { errorName: "Aborted" }));
      },
      { once: true },
    );
  });
}

/**
 * The error for a failed job. The API sends `error` as a plain string; an object form ({ name, message }) is still
 * read so either shape gives the job's real reason instead of a generic message.
 */
export function jobFailureError(error: StatusResponse["error"]): TryItOnError {
  const message = typeof error === "string" ? error : error?.message;
  const name = typeof error === "object" && error?.name ? error.name : "ProcessingError";
  return new TryItOnError(message || "Try-on failed.", { errorName: name });
}
