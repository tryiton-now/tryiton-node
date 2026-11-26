/**
 * Raised for any API-level error (bad request, auth, rate limit, out of credits,
 * server error) and for runtime failures surfaced while polling a job.
 */
export class TryItOnError extends Error {
  /** HTTP status code, or null for a runtime (job) failure. */
  readonly status: number | null;
  /** The API error name, e.g. "OutOfCredits" or "ProcessingError". */
  readonly errorName: string | null;

  constructor(message: string, opts: { status?: number | null; errorName?: string | null } = {}) {
    super(message);
    this.name = "TryItOnError";
    this.status = opts.status ?? null;
    this.errorName = opts.errorName ?? null;
    Object.setPrototypeOf(this, TryItOnError.prototype);
  }
}
