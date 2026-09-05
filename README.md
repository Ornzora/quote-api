# quote-api

Quote image generation API for Telegram messages, with a small web Playground and support for PNG/WebP output.

## Requirements

- Node.js 24.x
- A Telegram Bot API token in `BOT_TOKEN` when Telegram file links are needed

## Installation

```bash
git clone https://github.com/Ornzora/quote-api.git
cd quote-api
npm install
```

The install step prepares the UI and renderer fonts through `scripts/download-fonts.js`.

## Running

```bash
export BOT_TOKEN=your_telegram_bot_token
npm start
```

The local Koa server exposes the API at `/generate`. The Vercel deployment uses `/quote/generate` through `api/index.js` and `vercel.json`.

## Web Playground

Open `/` for the built-in Playground. It exposes the existing quote controls plus three optional color controls:

- **Bubble color** — default `#FFFFFF`
- **Name color** — default `#000000`
- **Text color** — default `#000000`

The controls update the actual JSON request used by the Playground; they are not visual-only settings.

## API

### `POST /generate`

On the deployed Vercel instance the equivalent route is:

```text
POST /quote/generate
```

Content-Type:

```text
application/json
```

### Request parameters

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `botToken` | string | No | Telegram Bot API token. Falls back to `BOT_TOKEN`. Avoid putting secrets in URLs; JSON body is preferred. |
| `type` | string | No | `quote`, `image`, or `stories`. If omitted, the raw quote canvas is returned. |
| `format` | string | No | `png` or `webp` for JSON/base64 generation. Default `png`. |
| `ext` | string | No | `png` or `webp`. Returns binary image bytes instead of base64. |
| `backgroundColor` | string | No | Existing background behavior: HEX, CSS color, `random`, gradient syntax such as `#111/#222`, and the existing semi-transparent `//` syntax. |
| `bubbleColor` | string | No | Quote bubble color. HEX only: `#RGB` or `#RRGGBB`. Default `#FFFFFF`. |
| `nameColor` | string | No | Sender name color. HEX only: `#RGB` or `#RRGGBB`. Default `#000000`. |
| `textColor` | string | No | Message text color. HEX only: `#RGB` or `#RRGGBB`. Default `#000000`. |
| `width` | number | No | Layout width before scaling. Must be finite and between `1` and `2048`. Default `512`. |
| `height` | number | No | Layout height before scaling. Must be finite and between `1` and `2048`. Default `512`. |
| `scale` | number | No | Rendering scale. Must be finite and between `1` and `4`. Default `2`. |
| `emojiBrand` | string | No | Emoji brand, such as `apple` or `google`. Unknown brands fall back to `apple`. |
| `messages` | array | Yes | Telegram-style messages to render. |

Invalid dimensions, scale, format, or HEX customization colors are rejected with a `400` response rather than being passed to the renderer.

### Message object

```json
{
  "from": {
    "id": 1,
    "name": "Alice",
    "photo": { "url": "https://example.com/avatar.jpg" }
  },
  "text": "Hello world",
  "entities": [],
  "avatar": true,
  "replyMessage": {}
}
```

Supported message features include sender information, text entities, avatars, replies, media, voice messages, documents, audio, forwarded labels, and Telegram custom emoji as supported by the renderer.

## Color customization

Colors are applied by the server before rendering and are used by the quote compositor:

```json
{
  "bubbleColor": "#FFFFFF",
  "nameColor": "#000000",
  "textColor": "#000000",
  "messages": [
    {
      "from": { "id": 1, "name": "Alice" },
      "text": "Hello world"
    }
  ]
}
```

Example with custom colors:

```json
{
  "bubbleColor": "#F5E6C8",
  "nameColor": "#7A3E00",
  "textColor": "#241A12",
  "messages": [
    {
      "from": { "id": 1, "name": "Alice" },
      "text": "Hello world"
    }
  ]
}
```

Only `#RGB` and `#RRGGBB` values are accepted for these three fields. Values such as `red`, `rgb(...)`, malformed hex, or arbitrary CSS are rejected.

## Request example

```http
POST /quote/generate
Content-Type: application/json

{
  "backgroundColor": "#1b1429",
  "bubbleColor": "#FFFFFF",
  "nameColor": "#000000",
  "textColor": "#000000",
  "width": 512,
  "height": 768,
  "scale": 2,
  "emojiBrand": "apple",
  "messages": [
    {
      "from": {
        "id": 66478514,
        "first_name": "Alice",
        "last_name": "Example"
      },
      "text": "Welcome to the quote generator!",
      "entities": [],
      "avatar": false
    }
  ]
}
```

## JSON response

Without `ext`, the image is returned as a base64 string:

```json
{
  "ok": true,
  "result": {
    "image": "<base64>",
    "type": null,
    "width": 1054,
    "height": 122,
    "ext": null
  }
}
```

For `format: "webp"`, the base64 payload contains actual WebP bytes.

## Binary output

Use an extension in the API path or set `ext` in the request. For example:

```http
POST /quote/generate.webp
Content-Type: application/json
```

or:

```json
{
  "ext": "webp",
  "messages": [
    {
      "from": { "id": 1, "name": "Alice" },
      "text": "Hello"
    }
  ]
}
```

Binary responses use `image/png` or `image/webp` according to the requested extension and include `quote-type`, `quote-width`, and `quote-height` headers.

## Output types

- `type: "quote"` — framed quote output, resized to the quote output limits.
- `type: "image"` — quote placed on the generated wallpaper.
- `type: "stories"` — quote placed into a `720×1280` story canvas.
- No `type` — raw generated quote canvas.

The `format` field controls PNG/WebP encoding for JSON/base64 output. The `ext` field controls binary output and its actual encoded bytes.

## Direct endpoints

The deployed API supports:

```text
POST /quote/generate
POST /quote/generate.png
POST /quote/generate.webp
GET  /health
```

Locally, the same routes are available without the `/quote` deployment prefix:

```text
POST /generate
POST /generate.png
POST /generate.webp
GET  /health
```

## Error responses

Validation and processing errors use the existing response envelope:

```json
{
  "ok": false,
  "error": {
    "code": 400,
    "message": "..."
  }
}
```

Common validation errors include:

```json
{"error":"query_empty"}
{"error":"messages_empty"}
{"error":"width and height must be finite numbers between 1 and 2048"}
{"error":"scale must be a finite number between 1 and 4"}
{"error":"format must be png or webp"}
{"error":"bubbleColor, nameColor, and textColor must be valid hex colors (#RGB or #RRGGBB)"}
```

## Security and resource limits

- Remote image URLs accept only HTTP(S).
- URLs containing credentials are rejected.
- DNS-resolved private, loopback, link-local, reserved, multicast, and documentation address ranges are blocked.
- Redirect targets are validated again before following them.
- Remote image responses are limited to 20 MB and requests time out after 10 seconds.
- Public quote dimensions are limited to `2048×2048` before scaling, with a maximum scale of `4`.
- Renderer cache is capped at 64 MB with a 45-minute age limit.
- Production request logging is disabled so query-string bot tokens are not written by `koa-logger`.
- Unexpected server errors are returned as `Internal server error`; configured bot tokens are redacted from logged error messages.

## Tests

Run the regression suite with:

```bash
npm test
```

`test-fixes.js` includes checks for avatar/media fixes, color customization, PNG/WebP byte formats, invalid dimensions/scale/colors/formats, and SSRF-related URL rejection.

## License

MIT
