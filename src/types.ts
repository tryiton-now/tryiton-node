// Public types of the SDK. Every name here is re-exported from index.ts.

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

/** A job failure as an object. The API currently sends the reason as a plain string instead. */
export interface JobError {
  name: string;
  message: string;
}

export interface StatusResponse {
  ok: boolean;
  status: JobStatus;
  /** CDN URLs of the result image(s); present when completed. Expire after 72h. */
  output?: string[];
  /**
   * Why the job failed, or null. The API sends a plain string; `JobError` stays in the union for code written
   * against earlier SDK versions. `waitForResult` turns either form into a `TryItOnError`.
   */
  error?: string | JobError | null;
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

/** @deprecated See `TryOnFashionParams.mode`. */
export type Mode = "performance" | "balanced" | "quality";

export type OutputFormat = "png" | "jpeg";

/** @deprecated See `TryOnFashionParams.moderationLevel`. */
export type ModerationLevel = "conservative" | "permissive" | "none";

export interface TryOnFashionParams {
  /** URL or base64 data URL of the person. */
  modelImage: string;
  /** URL or base64 data URL of the garment/accessory. */
  garmentImage: string;
  /** What the item is. `auto` detects it for you. */
  category?: Category;
  /** Required for `clothing`, `jewelry`, `accessories` (e.g. "tops"). */
  subcategory?: string;
  /** @deprecated Ignored by the API; will be removed in 3.0. */
  mode?: Mode;
  /** Number of output images, 1–4. Charged per image. */
  numSamples?: number;
  /** Output image format, "png" or "jpeg". Defaults to "png". */
  outputFormat?: OutputFormat;
  /**
   * @deprecated Validated but has no effect: the AI providers' own safety filters always apply. Will be removed in 3.0.
   */
  moderationLevel?: ModerationLevel;
}

export interface TryOnHairstyleParams {
  /** URL or base64 data URL of the person's face. */
  faceImage: string;
  /** One of the supported haircut values (see HAIRCUTS). */
  haircut: string;
  /** Optional free-text color, e.g. "ash blonde". Omit to keep current color. */
  hairColor?: string;
  /** Number of output images, 1–4. Charged per image. */
  numSamples?: number;
  /** Output image format, "png" or "jpeg". Defaults to "png". */
  outputFormat?: OutputFormat;
}

/**
 * Rectangle on the body image, normalized 0–1 from its TOP-LEFT corner.
 * Each side must be at least 0.06 of the image.
 */
export interface TattooRegion {
  /** Left edge, 0–1. */
  x: number;
  /** Top edge, 0–1. */
  y: number;
  /** Width, 0–1. */
  w: number;
  /** Height, 0–1. */
  h: number;
}

export interface TryOnTattooParams {
  /** URL or base64 data URL — a close-up of bare skin. */
  bodyImage: string;
  /** URL or base64 data URL of the tattoo design on its own. */
  designImage: string;
  /** Optional free-text placement/size, max 140 chars. */
  placement?: string;
  /** Optional exact spot for the ink; when set, `placement` only describes size/style. */
  region?: TattooRegion;
  /** Number of output images, 1–4. Charged per image. */
  numSamples?: number;
  /** Output image format, "png" or "jpeg". Defaults to "png". */
  outputFormat?: OutputFormat;
}

// ── Live (real-time webcam) try-on ─────────────────────────────────────────
// Server side only. The end user's browser streams with the `tryiton-live` package, using the response of
// startLiveSession (session-scoped credentials; never your API key).

export interface LiveConfig {
  enabled: boolean;
  /** Seconds of streaming one credit buys. */
  secondsPerCredit: number;
  /** Longest session allowed. */
  maxSeconds: number;
  /** Credits needed to start a session. */
  minCredits: number;
  /** Parallel sessions per account. */
  maxConcurrentSessions: number;
}

export interface PrepareLiveGarmentParams {
  /** URL or base64 data URL of the garment (a product photo on a plain background works best). */
  garmentImage: string;
  /** Recommended: what the item is. Omit to let it be detected. */
  category?: Category;
  /** e.g. "tops" for clothing. */
  subcategory?: string;
}

export interface LiveGarment {
  /** Pass to startLiveSession / switchGarment. */
  id: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  createdAt: string;
}

/** The stream input of a prepared garment, as returned with the first garment of startLiveSession. */
export interface LiveGarmentInput {
  prompt: string;
  enhancePrompt: boolean;
  referenceImage: string;
}

/** Session-scoped media connection the browser streams with. */
export interface LiveConnection {
  provider: string;
  model: string;
  token: string;
}

export interface StartLiveSessionParams {
  /** A prepared garment to start with. */
  garmentId?: string;
  /** Cap this session, 10..maxSeconds. */
  maxSeconds?: number;
  /** Your id for the end user: one stream per end user, a restart ends their previous one. */
  endUserId?: string;
  /** Lock the media token to your site, e.g. "https://shop.example.com". */
  allowedOrigin?: string;
}

export interface LiveSession {
  id: string;
  status: "active" | "ended";
  /** e.g. "user", "time_limit", "out_of_credits", "superseded", "error". */
  endReason: string | null;
  /** Streamed seconds once ended; billed seconds while running. */
  seconds: number;
  creditsCharged: number;
  endUserId: string | null;
  createdAt: string;
  endedAt: string | null;
}

/** Response of startLiveSession. Send it to the browser as-is and pass it to `connectLiveTryOn`. */
export interface LiveSessionStart {
  ok: true;
  session: LiveSession;
  /** Session-scoped secret the browser uses for billing heartbeats. */
  clientSecret: string;
  connection: LiveConnection;
  secondsPerCredit: number;
  maxSeconds: number;
  secondsLeft: number;
  /** The first garment, including its stream input, when garmentId was given. */
  garment: (LiveGarment & { input: LiveGarmentInput }) | null;
}

export interface WaitOptions {
  /** How often to poll, in ms. Default 2000. */
  pollIntervalMs?: number;
  /** Give up after this many ms. Default 120000. */
  timeoutMs?: number;
  /** Abort the wait. */
  signal?: AbortSignal;
}
