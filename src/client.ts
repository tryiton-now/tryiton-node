import { DEFAULT_BASE_URL, DEFAULT_POLL_INTERVAL_MS, DEFAULT_TIMEOUT_MS, DEFAULT_WAIT_TIMEOUT_MS } from "./constants";
import { TryItOnError } from "./errors";
import { request, type HttpConfig, type HttpMethod } from "./http";
import { jobFailureError, sleep } from "./polling";
import type {
  Credits,
  FetchLike,
  LiveConfig,
  LiveGarment,
  LiveSession,
  LiveSessionStart,
  PrepareLiveGarmentParams,
  StartLiveSessionParams,
  StatusResponse,
  TryItOnOptions,
  TryOnFashionParams,
  TryOnHairstyleParams,
  TryOnTattooParams,
  WaitOptions,
} from "./types";

export class TryItOn {
  private readonly http: HttpConfig;

  constructor(options: TryItOnOptions) {
    if (!options || !options.apiKey) throw new TryItOnError("An apiKey is required.", { errorName: "ConfigError" });
    const fetchImpl = options.fetch ?? (globalThis.fetch as FetchLike | undefined);
    if (!fetchImpl) {
      throw new TryItOnError(
        "No fetch implementation found. Use Node 18+, or pass `fetch` in options.",
        { errorName: "ConfigError" },
      );
    }
    this.http = {
      apiKey: options.apiKey,
      baseUrl: (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, ""),
      timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      fetchImpl,
    };
  }

  /** Put a garment or accessory on a person. Returns the job id. */
  async tryOnFashion(params: TryOnFashionParams): Promise<string> {
    const body = {
      model_image: params.modelImage,
      garment_image: params.garmentImage,
      category: params.category,
      subcategory: params.subcategory,
      mode: params.mode,
      num_samples: params.numSamples,
      output_format: params.outputFormat,
      moderation_level: params.moderationLevel,
    };
    const res = await this.request<{ jobId: string }>("POST", "/tryon/fashion", body);
    return res.jobId;
  }

  /** Restyle a person's hair. Returns the job id. */
  async tryOnHairstyle(params: TryOnHairstyleParams): Promise<string> {
    const body = {
      face_image: params.faceImage,
      haircut: params.haircut,
      hair_color: params.hairColor,
      num_samples: params.numSamples,
      output_format: params.outputFormat,
    };
    const res = await this.request<{ jobId: string }>("POST", "/tryon/hairstyle", body);
    return res.jobId;
  }

  /** Ink a design onto skin. Returns the job id. */
  async tryOnTattoo(params: TryOnTattooParams): Promise<string> {
    const body = {
      body_image: params.bodyImage,
      design_image: params.designImage,
      placement: params.placement,
      region: params.region,
      num_samples: params.numSamples,
      output_format: params.outputFormat,
    };
    const res = await this.request<{ jobId: string }>("POST", "/tryon/tattoo", body);
    return res.jobId;
  }

  /** Fetch the current status of a job. */
  async getStatus(jobId: string): Promise<StatusResponse> {
    return this.request<StatusResponse>("GET", `/status/${encodeURIComponent(jobId)}`);
  }

  /** Fetch your current credit balance. */
  async getCredits(): Promise<Credits> {
    const res = await this.request<{ credits: Credits }>("GET", "/credits");
    return res.credits;
  }

  /** Live try-on availability and pricing for your account. */
  async getLiveConfig(): Promise<LiveConfig> {
    const { ok: _ok, ...config } = await this.request<LiveConfig & { ok: boolean }>("GET", "/live/config");
    return config;
  }

  /**
   * Prepare a garment for live try-on. Do it ahead (e.g. at catalog sync): it's cached per image and category,
   * so starting a session or switching garments later is instant.
   */
  async prepareLiveGarment(params: PrepareLiveGarmentParams): Promise<LiveGarment> {
    const body = { garment_image: params.garmentImage, category: params.category, subcategory: params.subcategory };
    const res = await this.request<{ garment: LiveGarment }>("POST", "/live/garments", body);
    return res.garment;
  }

  /**
   * Start a live session for one end user. Holds the first credit. Return the result to the browser unchanged;
   * it streams with `connectLiveTryOn` from the `tryiton-live` package.
   */
  async startLiveSession(params: StartLiveSessionParams = {}): Promise<LiveSessionStart> {
    const body = {
      garment_id: params.garmentId,
      max_seconds: params.maxSeconds,
      end_user_id: params.endUserId,
      allowed_origin: params.allowedOrigin,
    };
    return this.request<LiveSessionStart>("POST", "/live/sessions", body);
  }

  /** Status and usage of a live session. */
  async getLiveSession(sessionId: string): Promise<LiveSession> {
    const res = await this.request<{ session: LiveSession }>("GET", `/live/sessions/${encodeURIComponent(sessionId)}`);
    return res.session;
  }

  /** End a live session from your server (e.g. the user left). Idempotent. */
  async stopLiveSession(sessionId: string): Promise<LiveSession> {
    const res = await this.request<{ session: LiveSession }>("POST", `/live/sessions/${encodeURIComponent(sessionId)}/stop`, {});
    return res.session;
  }

  /**
   * Poll a job until it completes, then resolve with the output image URLs.
   * Throws a TryItOnError if the job fails (errorName "ProcessingError", message = the job's reason),
   * the timeout is reached ("Timeout") or the signal aborts ("Aborted").
   */
  async waitForResult(jobId: string, opts: WaitOptions = {}): Promise<string[]> {
    const pollInterval = opts.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    const timeout = opts.timeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS;
    const start = Date.now();
    for (;;) {
      const res = await this.getStatus(jobId);
      if (res.status === "completed") return res.output ?? [];
      if (res.status === "failed") throw jobFailureError(res.error);
      if (Date.now() - start > timeout) {
        throw new TryItOnError(`Timed out waiting for job ${jobId} after ${timeout}ms.`, { errorName: "Timeout" });
      }
      await sleep(pollInterval, opts.signal);
    }
  }

  private request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
    return request<T>(this.http, method, path, body);
  }
}
