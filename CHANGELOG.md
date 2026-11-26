# Changelog

All notable changes to `tryiton` are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [2.1.0] - Unreleased

### Added

- Live (real-time webcam) try-on, server side: `getLiveConfig()`, `prepareLiveGarment()`, `startLiveSession()`,
  `getLiveSession()` and `stopLiveSession()`, with the `LiveConfig`, `LiveGarment`, `LiveGarmentInput`,
  `LiveConnection`, `LiveSession`, `LiveSessionStart`, `PrepareLiveGarmentParams` and `StartLiveSessionParams` types.
  The end user's browser streams with the `tryiton-live` package.
- `VERSION` export with the SDK version.
- Every request sends `User-Agent: tryiton-node/<VERSION>` (browsers ignore it).
- A contract test suite that runs the cases shared by all TryItOn SDKs, unit tests, and CI on Node 18, 20 and 22.

### Fixed

- API errors now carry the API's `error.name` and `error.message`. Before, `message` was a generic `HTTP 4xx` and
  `errorName` held the whole error object instead of its name.
- `waitForResult` throws with the job's real failure reason (e.g. "We couldn't find a person in the photo.") and
  `errorName: "ProcessingError"`, instead of a generic "Try-on failed.".
- An error response with an empty or whitespace-only body reports `HTTP <status>` instead of a blank message.

### Changed

- `StatusResponse.error` is typed `string | JobError | null`, matching the API, which sends the failure reason as a
  plain string. TypeScript code that read `status.error.message` (always `undefined` at runtime) now needs to narrow
  first, e.g. `typeof status.error === "string"`.
- `src/index.ts` is split into focused modules. The public exports are unchanged.

## [2.0.0] - 2026-07-14

### Changed

- **Breaking:** `tryOnClothes` is renamed `tryOnFashion` (and `TryOnClothesParams` → `TryOnFashionParams`). It calls
  `POST /tryon/fashion`, which covers clothing, footwear, eyewear, headwear, jewelry and accessories.

## [1.1.1] - 2026-07-14

### Added

- `region` on tattoo try-on: a normalized rectangle (`TattooRegion`) that pins where the design goes.

## [1.0.0] - 2026-06-24

### Added

- `numSamples` (1–4) and `outputFormat` (`png` / `jpeg`) on every try-on, including hairstyle and tattoo.
- `OutputFormat` and `ModerationLevel` types; `moderationLevel` takes `conservative`, `permissive` or `none`.

### Removed

- **Breaking:** the `seed`, `segmentationFree` and `garmentPhotoType` options of clothes try-on.

## [0.1.0] - 2026-06-22

First release: clothes, hairstyle and tattoo try-on, `getStatus`, `waitForResult`, `getCredits` and `TryItOnError`.

[2.1.0]: https://github.com/tryiton-now/tryiton-node/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/tryiton-now/tryiton-node/compare/v1.1.1...v2.0.0
[1.1.1]: https://github.com/tryiton-now/tryiton-node/compare/v1.0.0...v1.1.1
[1.0.0]: https://github.com/tryiton-now/tryiton-node/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/tryiton-now/tryiton-node/releases/tag/v0.1.0
