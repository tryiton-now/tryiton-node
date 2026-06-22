# TryItOn Node.js SDK — AI Virtual Try-On API for JavaScript & TypeScript

Official Node.js and TypeScript client for the [TryItOn](https://tryiton.now) virtual try-on API. Add photoreal AI virtual try-on for clothing, accessories, hairstyles, and tattoos to your JavaScript or TypeScript application with a few lines of code.

- Virtual clothing try-on and accessory try-on (eyewear, footwear, headwear, jewelry)
- Hairstyle and tattoo try-on
- Fully typed, zero runtime dependencies (uses the native `fetch` API)
- Built-in job polling helper

Full API reference: [docs.tryiton.now](https://docs.tryiton.now) · Get an API key: [tryiton.now/app/developer](https://tryiton.now/app/developer)

## Installation

```bash
npm install tryiton
```

Requires Node.js 18 or later (or any runtime with a global `fetch`, such as Bun, Deno, or modern browsers). TypeScript types are bundled.

## Quickstart: run a virtual try-on

Submit a garment and a model photo, then wait for the generated result image.

```ts
import { TryItOn } from "tryiton";

const client = new TryItOn({ apiKey: process.env.TRYITON_API_KEY });

// Submit a clothing try-on
const jobId = await client.tryOnClothes({
  modelImage: "https://example.com/model.jpg",
  garmentImage: "https://example.com/tshirt.jpg",
  category: "clothing",
  subcategory: "tops",
});

// Poll until the job completes and return the output image URL(s)
const [resultUrl] = await client.waitForResult(jobId);
console.log(resultUrl); // CDN URL, available for 72 hours
```

Image inputs accept a public URL or a base64 data URL (`data:image/png;base64,...`).

## Core parameters

`tryOnClothes` covers clothing and accessory try-on. The most important parameters:

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `modelImage` | string | Yes | URL or base64 data URL of the person. |
| `garmentImage` | string | Yes | URL or base64 data URL of the garment or accessory. |
| `category` | string | No | Item type: `auto`, `clothing`, `eyewear`, `footwear`, `headwear`, `jewelry`, `accessories`, or `others`. `auto` detects it for you. |
| `subcategory` | string | No | Required for `clothing` (`tops`, `bottoms`, `dresses`), `jewelry`, and `accessories`. |

Additional clothing options (`mode`, `numSamples`, `outputFormat`, `seed`) are documented in the [API reference](https://docs.tryiton.now).

## Other endpoints

```ts
// Hairstyle try-on (see the HAIRCUTS export for all supported values)
await client.tryOnHairstyle({ faceImage, haircut: "BuzzCut", hairColor: "ash blonde" });

// Tattoo try-on
await client.tryOnTattoo({ bodyImage, designImage, placement: "on the right forearm, small" });

// Poll a job manually, or check your credit balance
const status = await client.getStatus(jobId);   // { status, output, error }
const credits = await client.getCredits();        // { on_demand, subscription, purchased, reserved }
```

## Error handling

All failures throw `TryItOnError`, which carries the HTTP status code and the API error name.

```ts
import { TryItOn, TryItOnError } from "tryiton";

try {
  await client.tryOnClothes({ /* ... */ });
} catch (err) {
  if (err instanceof TryItOnError) {
    console.error(err.status, err.errorName, err.message); // e.g. 429, "OutOfCredits"
  }
}
```

## Notes

- Output image URLs expire 72 hours after completion. Download any results you want to keep.
- Failed jobs are never charged.

## Documentation

Full documentation, parameter reference, and guides: [docs.tryiton.now](https://docs.tryiton.now)

## License

MIT
