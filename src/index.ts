/**
 * TryItOn — official JavaScript / TypeScript SDK.
 *
 * Wraps the TryItOn virtual try-on REST API (https://docs.tryiton.now).
 * Requires a runtime with a global `fetch` (Node 18+, Bun, Deno, browsers) or a
 * `fetch` implementation passed via options.
 */

const DEFAULT_BASE_URL = "https://tryiton.now/api/v1";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface TryItOnOptions {
  /** Your API key from https://tryiton.now/app/developer */
  apiKey: string;
  /** Override the API base URL. Defaults to https://tryiton.now/api/v1 */
  baseUrl?: string;
  /** Per-request timeout in milliseconds. Defaults to 60000. */
  timeoutMs?: number;
  /** Custom fetch implementation (e.g. node-fetch on older Node). */
  fetch?: FetchLike;
}

export type JobStatus = "processing" | "completed" | "failed";

export interface JobError {
  name: string;
  message: string;
}

export interface StatusResponse {
  ok: boolean;
  status: JobStatus;
  /** CDN URLs of the result image(s); present when completed. Expire after 72h. */
  output?: string[];
  error?: JobError | null;
}

export interface Credits {
  on_demand: number;
  subscription: number;
  purchased: number;
  reserved: number;
}

export type Category =
  | "auto"
  | "clothing"
  | "eyewear"
  | "footwear"
  | "headwear"
  | "jewelry"
  | "accessories"
  | "others";

export type Mode = "performance" | "balanced" | "quality";

export interface TryOnClothesParams {
  /** URL or base64 data URL of the person. */
  modelImage: string;
  /** URL or base64 data URL of the garment/accessory. */
  garmentImage: string;
  /** What the item is. `auto` detects it for you. */
  category?: Category;
  /** Required for `clothing`, `jewelry`, `accessories` (e.g. "tops"). */
  subcategory?: string;
  /** Quality/speed trade-off (clothing only). */
  mode?: Mode;
  /** Number of output images, 1–4 (clothing only). Charged per image. */
  numSamples?: number;
  /** "png" or "jpeg" (clothing only). */
  outputFormat?: "png" | "jpeg";
  /** Fixes randomness (clothing only). */
  seed?: number;
  /** Advanced (clothing only). */
  segmentationFree?: boolean;
  /** Advanced hint: "auto" | "model" | "flat-lay" (clothing only). */
  garmentPhotoType?: "auto" | "model" | "flat-lay";
  /** Advanced (clothing only). */
  moderationLevel?: string;
}

export interface TryOnHairstyleParams {
  /** URL or base64 data URL of the person's face. */
  faceImage: string;
  /** One of the supported haircut values (see HAIRCUTS). */
  haircut: string;
  /** Optional free-text color, e.g. "ash blonde". Omit to keep current color. */
  hairColor?: string;
}

export interface TryOnTattooParams {
  /** URL or base64 data URL — a close-up of bare skin. */
  bodyImage: string;
  /** URL or base64 data URL of the tattoo design on its own. */
  designImage: string;
  /** Optional free-text placement/size, max 140 chars. */
  placement?: string;
}

export interface WaitOptions {
  /** How often to poll, in ms. Default 2000. */
  pollIntervalMs?: number;
  /** Give up after this many ms. Default 120000. */
  timeoutMs?: number;
  /** Abort the wait. */
  signal?: AbortSignal;
}

/** The supported `haircut` values for hairstyle try-on. */
export const HAIRCUTS = [
  "Afro", "BobCut", "BowlCut", "BoxBraids", "BuzzCut", "Chignon", "CombOver",
  "CornrowBraids", "CurlyBob", "CurlyShag", "DoubleBun", "Dreadlocks", "FauxHawk",
  "FishtailBraid", "LongCurly", "LongHairTiedUp", "LongHimeCut", "LongStraight",
  "LongTwintails", "LongWavy", "LongWavyCurtainBangs", "ManBun", "MessyTousled",
  "PixieCut", "Pompadour", "Ponytail", "ShortCurlyPixie", "ShortTwintails",
  "ShoulderLengthHair", "Spiky", "TexturedFringe", "TwinBraids", "Updo", "WavyShag",
] as const;

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

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
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

export class TryItOn {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;

  constructor(options: TryItOnOptions) {
    if (!options || !options.apiKey) throw new TryItOnError("An apiKey is required.", { errorName: "ConfigError" });
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? 60000;
    const f = options.fetch ?? (globalThis.fetch as FetchLike | undefined);
    if (!f) {
      throw new TryItOnError(
        "No fetch implementation found. Use Node 18+, or pass `fetch` in options.",
        { errorName: "ConfigError" },
      );
    }
    this.fetchImpl = f;
  }

  /** Put a garment or accessory on a person. Returns the job id. */
  async tryOnClothes(params: TryOnClothesParams): Promise<string> {
    const body = {
      model_image: params.modelImage,
      garment_image: params.garmentImage,
      category: params.category,
      subcategory: params.subcategory,
      mode: params.mode,
      num_samples: params.numSamples,
      output_format: params.outputFormat,
      seed: params.seed,
      segmentation_free: params.segmentationFree,
      garment_photo_type: params.garmentPhotoType,
      moderation_level: params.moderationLevel,
    };
    const res = await this.request<{ jobId: string }>("POST", "/tryon/clothes", body);
    return res.jobId;
  }

  /** Restyle a person's hair. Returns the job id. */
  async tryOnHairstyle(params: TryOnHairstyleParams): Promise<string> {
    const body = { face_image: params.faceImage, haircut: params.haircut, hair_color: params.hairColor };
    const res = await this.request<{ jobId: string }>("POST", "/tryon/hairstyle", body);
    return res.jobId;
  }

  /** Ink a design onto skin. Returns the job id. */
  async tryOnTattoo(params: TryOnTattooParams): Promise<string> {
    const body = { body_image: params.bodyImage, design_image: params.designImage, placement: params.placement };
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

  /**
   * Poll a job until it completes, then resolve with the output image URLs.
   * Throws a TryItOnError if the job fails or the timeout is reached.
   */
  async waitForResult(jobId: string, opts: WaitOptions = {}): Promise<string[]> {
    const pollInterval = opts.pollIntervalMs ?? 2000;
    const timeout = opts.timeoutMs ?? 120000;
    const start = Date.now();
    for (;;) {
      const res = await this.getStatus(jobId);
      if (res.status === "completed") return res.output ?? [];
      if (res.status === "failed") {
        throw new TryItOnError(res.error?.message ?? "Try-on failed.", {
          errorName: res.error?.name ?? "ProcessingError",
        });
      }
      if (Date.now() - start > timeout) {
        throw new TryItOnError(`Timed out waiting for job ${jobId} after ${timeout}ms.`, { errorName: "Timeout" });
      }
      await sleep(pollInterval, opts.signal);
    }
  }

  private async request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: body !== undefined ? JSON.stringify(stripUndefined(body)) : undefined,
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      if ((err as Error)?.name === "AbortError") {
        throw new TryItOnError(`Request timed out after ${this.timeoutMs}ms.`, { errorName: "Timeout" });
      }
      throw new TryItOnError(`Network error: ${(err as Error)?.message ?? String(err)}`, { errorName: "NetworkError" });
    } finally {
      clearTimeout(timer);
    }

    const text = await res.text();
    let data: any = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        if (!res.ok) throw new TryItOnError(text || `HTTP ${res.status}`, { status: res.status });
      }
    }

    if (!res.ok) {
      throw new TryItOnError(data?.message ?? `HTTP ${res.status}`, {
        status: res.status,
        errorName: data?.error ?? null,
      });
    }

    return data as T;
  }
}

function stripUndefined(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") return obj;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

export default TryItOn;
