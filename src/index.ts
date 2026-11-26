/**
 * TryItOn — official JavaScript / TypeScript SDK.
 *
 * Wraps the TryItOn virtual try-on REST API (https://docs.tryiton.now).
 * Requires a runtime with a global `fetch` (Node 18+, Bun, Deno, browsers) or a
 * `fetch` implementation passed via options.
 *
 * This file is the public entry point: it only re-exports. The code lives in
 * client.ts (the TryItOn class), http.ts, errors.ts, types.ts and constants.ts.
 */

import { TryItOn } from "./client";

export { TryItOn };
export { TryItOnError } from "./errors";
export { HAIRCUTS } from "./constants";
export { VERSION } from "./version";
export type {
  Category,
  Credits,
  FetchLike,
  JobError,
  JobStatus,
  LiveConfig,
  LiveConnection,
  LiveGarment,
  LiveGarmentInput,
  LiveSession,
  LiveSessionStart,
  Mode,
  ModerationLevel,
  OutputFormat,
  PrepareLiveGarmentParams,
  StartLiveSessionParams,
  StatusResponse,
  TattooRegion,
  TryItOnOptions,
  TryOnFashionParams,
  TryOnHairstyleParams,
  TryOnTattooParams,
  WaitOptions,
} from "./types";

export default TryItOn;
