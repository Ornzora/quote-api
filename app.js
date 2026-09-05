const logger = require('koa-logger')
const responseTime = require('koa-response-time')
const bodyParser = require('koa-bodyparser')
const ratelimit = require('koa-ratelimit')
const Router = require('@koa/router')
const Koa = require('koa')
const { loadFonts } = require('./utils')

const app = new Koa()

app.use(logger())
app.use(responseTime())
app.use(bodyParser())

const ratelimitDb = new Map()

app.use(ratelimit({
  driver: 'memory',
  db: ratelimitDb,
  duration: 1000 * 55,
  errorMessage: { ok: false, error: { code: 429, message: 'Rate limit exceeded. See "Retry-After"' } },
  id: (ctx) => ctx.ip,
  headers: { remaining: 'Rate-Limit-Remaining', reset: 'Rate-Limit-Reset', total: 'Rate-Limit-Total' },
  max: 20,
  disableHeader: false,
  whitelist: (ctx) => {
    const token = ctx.query.botToken || (ctx.request.body && ctx.request.body.botToken)
    return token === process.env.BOT_TOKEN
  },
  blacklist: () => {}
}))

const route = new Router()
const routes = require('./routes')

route.get('/', (ctx) => {
  ctx.status = 200
  ctx.type = 'text/html'
  ctx.body = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Quote API — a clean, self-hostable Telegram-style quote image generator API.">
<title>Quote API — Reimagined</title>
<style>
:root{color-scheme:dark;--bg:#09090b;--surface:#101013;--surface2:#141418;--border:#27272c;--border2:#3a3a42;--text:#f4f4f5;--muted:#a1a1aa;--subtle:#71717a;--green:#86efac;--red:#fda4af;--max:1240px}
*{box-sizing:border-box}html{scroll-behavior:smooth;scrollbar-width:none}html::-webkit-scrollbar,body::-webkit-scrollbar,pre::-webkit-scrollbar{width:0;height:0;display:none}body{margin:0;min-width:320px;overflow-x:hidden;background:var(--bg);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.6;scrollbar-width:none}a{color:inherit;text-decoration:none}button,select,textarea{font:inherit}button{-webkit-tap-highlight-color:transparent}code,pre,textarea,.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace}::selection{background:#3f3f46;color:#fff}
.container{width:min(var(--max),calc(100% - 48px));margin:0 auto}.skip{position:fixed;left:16px;top:16px;transform:translateY(-160%);z-index:100;padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--surface2)}.skip:focus{transform:none}
header{position:sticky;top:0;z-index:40;border-bottom:1px solid var(--border);background:rgba(9,9,11,.94);backdrop-filter:blur(12px)}nav{height:64px;display:flex;align-items:center;justify-content:space-between;gap:20px}.brand{display:inline-flex;align-items:center;gap:10px;font-size:14px;font-weight:750;letter-spacing:-.02em}.brand-mark{width:28px;height:28px;display:grid;place-items:center;border:1px solid #d4d4d8;border-radius:8px;background:#f4f4f5;color:#09090b;font-size:12px;font-weight:900}.navlinks{display:flex;align-items:center;gap:3px}.navlinks a{padding:8px 11px;border-radius:8px;color:var(--muted);font-size:13px}.navlinks a:hover{color:var(--text);background:var(--surface2)}.navlinks .health{border:1px solid var(--border);color:var(--text)}
.hero{padding:92px 0 78px;max-width:850px}.eyebrow{margin-bottom:14px;color:var(--subtle);font-size:11px;font-weight:750;letter-spacing:.14em;text-transform:uppercase}h1{margin:0;font-size:clamp(48px,7vw,88px);line-height:.98;letter-spacing:-.065em;font-weight:800}h1 .light{color:var(--muted);font-weight:520}.hero-copy{max-width:720px;margin:20px 0 0;color:var(--muted);font-size:clamp(15px,2vw,18px);line-height:1.7}.hero-row{display:flex;align-items:center;flex-wrap:wrap;gap:9px;margin-top:26px}.button{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:8px 13px;border:1px solid var(--border);border-radius:8px;background:var(--surface2);color:var(--text);font-size:12px;font-weight:700;cursor:pointer}.button:hover{border-color:var(--border2);background:var(--surface2)}.button.primary{background:var(--text);border-color:var(--text);color:var(--bg)}.button.primary:hover{background:#fff}.status{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:8px 12px;border:1px solid var(--border);border-radius:999px;color:var(--muted);font-size:12px}.status-dot{width:6px;height:6px;border-radius:50%;background:var(--green)}
.section{padding:48px 0 80px;scroll-margin-top:84px}.section-head{margin-bottom:22px}.eyebrow-small{margin-bottom:6px;color:var(--subtle);font-size:10px;font-weight:800;letter-spacing:.13em;text-transform:uppercase}.section-title{margin:0;font-size:clamp(25px,3vw,32px);line-height:1.15;letter-spacing:-.04em}.section-desc{max-width:720px;margin:8px 0 0;color:var(--muted);font-size:13px}
.endpoint-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.endpoint-card{padding:20px;border:1px solid var(--border);border-radius:12px;background:var(--surface);transition:border-color .18s,transform .18s;cursor:pointer}.endpoint-card:hover{border-color:var(--border2);transform:translateY(-1px)}.method{display:inline-flex;padding:3px 6px;border-radius:5px;background:#17231b;color:var(--green);font-size:9px;font-weight:800;letter-spacing:.04em}.endpoint-path{margin:13px 0 7px;font-size:13px;font-weight:700}.endpoint-card p{margin:0;color:var(--muted);font-size:12px}.endpoint-type{margin-top:13px;color:var(--subtle);font-size:10px}
.playground{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}.panel{min-width:0;border:1px solid var(--border);border-radius:12px;background:var(--surface);overflow:hidden}.panel-head{min-height:52px;padding:12px 15px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid var(--border)}.panel-title{font-size:12px;font-weight:750}.panel-meta{color:var(--subtle);font-size:10px}.panel-body{padding:15px}.field{margin-bottom:13px}label{display:block;margin-bottom:6px;color:var(--muted);font-size:11px;font-weight:700}select,textarea{width:100%;border:1px solid var(--border);border-radius:8px;outline:none;background:#0c0c0f;color:var(--text)}select{height:39px;padding:0 10px;font-size:12px}textarea{min-height:360px;padding:12px;resize:vertical;font-size:11px;line-height:1.7}select:focus,textarea:focus{border-color:#52525b}.actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.actions .button{min-height:38px}.result{min-height:464px;display:flex;align-items:center;justify-content:center;padding:18px;border:1px dashed #303036;border-radius:9px;background:#0c0c0f;overflow:hidden}.result img{display:block;max-width:100%;max-height:600px;width:auto;height:auto;border-radius:5px}.placeholder{max-width:300px;color:var(--subtle);text-align:center;font-size:12px}.placeholder strong{display:block;margin-bottom:4px;color:var(--muted);font-size:13px}.result-error{max-width:100%;color:var(--red);white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px}.result-footer{min-height:37px;display:flex;align-items:center;justify-content:space-between;gap:10px}.result-meta{color:var(--subtle);font-size:10px}.mini{padding:6px 9px;border:1px solid var(--border);border-radius:7px;background:var(--surface2);color:var(--muted);font-size:10px;cursor:pointer}.mini:hover{color:var(--text);border-color:var(--border2)}
.docs{display:grid;grid-template-columns:180px minmax(0,1fr);gap:42px;align-items:start}.docs-nav{position:sticky;top:88px;border-left:1px solid var(--border);padding-left:14px}.docs-nav a{display:block;padding:5px 0;color:var(--subtle);font-size:12px}.docs-nav a:hover,.docs-nav a.active{color:var(--text)}.doc{min-width:0}.doc-section{margin-bottom:58px;scroll-margin-top:88px}.doc-section:last-child{margin-bottom:0}.doc h3{margin:0 0 9px;font-size:21px;letter-spacing:-.025em}.doc h4{margin:24px 0 9px;font-size:14px}.doc p,.doc li{color:var(--muted);font-size:12px}.doc ul{margin:8px 0 0;padding-left:18px}.table-wrap{overflow-x:auto;border:1px solid var(--border);border-radius:9px}table{width:100%;border-collapse:collapse;min-width:680px;font-size:11px}th,td{padding:9px 11px;border-bottom:1px solid var(--border);text-align:left;vertical-align:top}th{background:var(--surface2);color:var(--text);font-weight:700}td{color:var(--muted)}tr:last-child td{border-bottom:0}td code,p code,li code{padding:2px 4px;border-radius:4px;background:var(--surface2);color:#d4d4d8;font-size:.92em}pre{margin:12px 0 0;padding:13px;overflow-x:auto;border:1px solid var(--border);border-radius:9px;background:#0c0c0f;color:#d4d4d8;font-size:10px;line-height:1.7;white-space:pre;scrollbar-width:none}.note{margin-top:12px;padding:11px 12px;border-left:2px solid #52525b;background:var(--surface);color:var(--muted);font-size:11px}.feature-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.feature{padding:14px;border:1px solid var(--border);border-radius:9px;background:var(--surface)}.feature strong{display:block;margin-bottom:4px;font-size:12px}.feature span{color:var(--muted);font-size:11px;line-height:1.55}.pill-list{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.pill{padding:4px 7px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--muted);font-size:10px}
footer{margin-top:90px;border-top:1px solid var(--border)}.footer-inner{min-height:70px;display:flex;align-items:center;justify-content:space-between;gap:15px;color:var(--subtle);font-size:10px}.toast{position:fixed;right:18px;bottom:18px;z-index:80;padding:9px 12px;border:1px solid var(--border);border-radius:8px;background:var(--surface2);color:var(--text);font-size:11px;opacity:0;transform:translateY(8px);pointer-events:none;transition:.18s}.toast.show{opacity:1;transform:none}
@media(max-width:900px){.endpoint-grid,.feature-grid{grid-template-columns:1fr}.playground{grid-template-columns:1fr}.docs{grid-template-columns:1fr;gap:24px}.docs-nav{position:static;display:flex;flex-wrap:wrap;gap:4px 15px;border-left:0;border-bottom:1px solid var(--border);padding:0 0 12px}.docs-nav a{padding:0}.result{min-height:390px}}
@media(max-width:600px){.container{width:min(100% - 28px,var(--max))}nav{height:58px}.brand-mark{width:26px;height:26px}.navlinks a:not(.health){display:none}.hero{padding:64px 0 55px}h1{font-size:clamp(45px,15vw,66px)}.hero-copy{font-size:14px}.section{padding:38px 0 58px}textarea{min-height:300px}.panel-body{padding:12px}.result{min-height:320px;padding:12px}.footer-inner{align-items:flex-start;flex-direction:column;justify-content:center;padding:16px 0}}
</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header><div class="container"><nav><a class="brand" href="#top" aria-label="Quote API home"><span class="brand-mark">Q</span><span>Quote API</span></a><div class="navlinks"><a href="#playground">Playground</a><a href="#documentation">Docs</a><a class="health" href="/health">Health</a></div></nav></div></header>
<main id="main"><div class="container" id="top">
<section class="hero"><div class="eyebrow">Telegram quote image generator</div><h1>Quote API <span class="light">reimagined.</span></h1><p class="hero-copy">A clean, self-hostable API for turning Telegram-style messages into shareable quote images — with text formatting, avatars, replies, media, voice waveforms, emoji sets and multiple output formats.</p><div class="hero-row"><a class="button primary" href="#playground">Try the playground</a><a class="button" href="#documentation">Read documentation</a><span class="status"><span class="status-dot"></span> API online</span></div></section>
<section class="section" id="endpoints"><div class="section-head"><div class="eyebrow-small">API surface</div><h2 class="section-title">Endpoints</h2><p class="section-desc">Three output paths cover base64 JSON responses and direct image responses.</p></div><div class="endpoint-grid">
<a class="endpoint-card" href="#playground" data-endpoint="/quote/generate"><span class="method">POST</span><div class="endpoint-path mono">/quote/generate</div><p>Generate a quote and return the image as base64 inside JSON.</p><div class="endpoint-type mono">application/json</div></a>
<a class="endpoint-card" href="#playground" data-endpoint="/quote/generate.png"><span class="method">POST</span><div class="endpoint-path mono">/quote/generate.png</div><p>Generate a PNG and return the image directly.</p><div class="endpoint-type mono">image/png</div></a>
<a class="endpoint-card" href="#playground" data-endpoint="/quote/generate.webp"><span class="method">POST</span><div class="endpoint-path mono">/quote/generate.webp</div><p>Generate a WebP and return the image directly.</p><div class="endpoint-type mono">image/webp</div></a>
</div></section>
<section class="section" id="playground"><div class="section-head"><div class="eyebrow-small">Try it</div><h2 class="section-title">Interactive playground</h2><p class="section-desc">Send a real request to this instance. Edit the JSON, choose an endpoint, then generate an image.</p></div><div class="playground">
<div class="panel"><div class="panel-head"><span class="panel-title">Request</span><span class="panel-meta mono">application/json</span></div><div class="panel-body"><div class="field"><label for="endpoint">Endpoint</label><select id="endpoint"><option value="/quote/generate">POST /quote/generate — base64 JSON</option><option value="/quote/generate.png">POST /quote/generate.png — PNG</option><option value="/quote/generate.webp">POST /quote/generate.webp — WebP</option></select></div><div class="field"><label for="payload">JSON body</label><textarea id="payload" spellcheck="false">{
  "backgroundColor": "#f68ac9",
  "width": 700,
  "height": 580,
  "scale": 2,
  "emojiBrand": "apple",
  "messages": [
    {
      "from": { "id": 1, "name": "Test User" },
      "text": "Hello world!",
      "avatar": false
    }
  ]
}</textarea></div><div class="actions"><button class="button primary" id="generate" type="button">Generate image</button><button class="button" id="reset" type="button">Reset</button></div></div></div>
<div class="panel"><div class="panel-head"><span class="panel-title">Result</span><span class="panel-meta mono" id="resultType">Waiting</span></div><div class="panel-body"><div class="result" id="result"><div class="placeholder"><strong>No image yet</strong>Run the request to preview the generated quote here.</div></div><div class="result-footer"><span class="result-meta mono" id="resultMeta">—</span><button class="mini" id="download" type="button" disabled>Download image</button></div></div></div>
</div></section>
<section class="section" id="documentation"><div class="section-head"><div class="eyebrow-small">Reference</div><h2 class="section-title">Documentation</h2><p class="section-desc">Everything supported by the current generator, with request fields, message fields, output behavior, examples and errors.</p></div><div class="docs">
<aside class="docs-nav" aria-label="Documentation navigation"><a href="#quickstart">Quick start</a><a href="#request">Request</a><a href="#message">Message</a><a href="#entities">Entities</a><a href="#media">Media</a><a href="#output">Output</a><a href="#features">Features</a><a href="#errors">Errors</a><a href="#examples">Examples</a></aside>
<div class="doc">
<article class="doc-section" id="quickstart"><h3>Quick start</h3><p>The simplest request needs a <code>messages</code> array containing a sender and text. The public route is prefixed with <code>/quote</code> on this deployment.</p><pre>curl -X POST https://YOUR-DOMAIN/quote/generate \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{
      "from": {"id": 1, "name": "User"},
      "text": "Hello world!"
    }]
  }'</pre><div class="note">The regular endpoint returns JSON. Its <code>result.image</code> value is base64-encoded unless a direct image extension is requested.</div></article>
<article class="doc-section" id="request"><h3>Request parameters</h3><p>Send JSON with <code>Content-Type: application/json</code>.</p><div class="table-wrap"><table><thead><tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr></thead><tbody>
<tr><td><code>messages</code></td><td>array</td><td>Yes</td><td>One or more Telegram-style messages to render.</td></tr><tr><td><code>botToken</code></td><td>string</td><td>No</td><td>Telegram bot token. If omitted, the server uses <code>BOT_TOKEN</code>. Needed when Telegram file IDs must be resolved.</td></tr><tr><td><code>type</code></td><td>string</td><td>No</td><td><code>quote</code> creates a framed quote; <code>image</code> adds the quote to a wallpaper; <code>stories</code> creates a 720×1280 story. Without a type, raw generated content is returned.</td></tr><tr><td><code>format</code></td><td>string</td><td>No</td><td><code>png</code> or <code>webp</code>. Used by the <code>quote</code> type; WebP is the default there.</td></tr><tr><td><code>ext</code></td><td>string</td><td>No</td><td><code>png</code> or <code>webp</code>. Normally set automatically by the <code>.png</code> or <code>.webp</code> URL.</td></tr><tr><td><code>backgroundColor</code></td><td>string</td><td>No</td><td>HEX, CSS color name, <code>random</code>, gradient using <code>#111/#222</code>, or a semi-transparent variant beginning with <code>//</code>.</td></tr><tr><td><code>width</code></td><td>number</td><td>No</td><td>Base layout width in pixels before scaling.</td></tr><tr><td><code>height</code></td><td>number</td><td>No</td><td>Base layout height in pixels before scaling.</td></tr><tr><td><code>scale</code></td><td>number</td><td>No</td><td>Rendering scale from 1 to 20. Default is 2.</td></tr><tr><td><code>emojiBrand</code></td><td>string</td><td>No</td><td>Emoji artwork set: <code>apple</code>, <code>google</code>, <code>twitter</code>, <code>joypixels</code>, <code>blob</code>.</td></tr>
</tbody></table></div></article>
<article class="doc-section" id="message"><h3>Message object</h3><p>Every entry in <code>messages</code> describes one Telegram-style message.</p><div class="table-wrap"><table><thead><tr><th>Field</th><th>Type</th><th>Description</th></tr></thead><tbody>
<tr><td><code>from</code></td><td>object</td><td>Sender. Supports <code>id</code>, <code>name</code>, <code>first_name</code>, <code>last_name</code>, <code>username</code>, <code>photo</code>, and optional <code>emoji_status</code>.</td></tr><tr><td><code>text</code></td><td>string</td><td>Message text.</td></tr><tr><td><code>entities</code></td><td>array</td><td>Telegram text entities used for formatting, mentions, links, code and custom emoji.</td></tr><tr><td><code>avatar</code></td><td>boolean</td><td>Whether to render the sender avatar.</td></tr><tr><td><code>replyMessage</code></td><td>object</td><td>Optional replied-to message. Supports <code>name</code>, <code>text</code>, <code>entities</code>, <code>chatId</code>, <code>from</code> and reply media.</td></tr><tr><td><code>media</code></td><td>object | array</td><td>Media by URL or Telegram file ID. Arrays can contain multiple files.</td></tr><tr><td><code>mediaType</code></td><td>string</td><td>Use <code>sticker</code> for sticker media.</td></tr><tr><td><code>mediaCrop</code></td><td>boolean</td><td>Crop media to maintain the intended proportions.</td></tr><tr><td><code>voice</code></td><td>object</td><td>Voice waveform data such as <code>{"waveform":[0,4,8,16]}</code>.</td></tr><tr><td><code>chatId</code></td><td>number</td><td>Used to group consecutive messages from the same sender/chat.</td></tr>
</tbody></table></div></article>
<article class="doc-section" id="entities"><h3>Text entities</h3><p>Entities follow Telegram's UTF-16 offset convention. Each entity has <code>type</code>, <code>offset</code>, and <code>length</code>; some types add extra data.</p><div class="pill-list"><span class="pill">bold</span><span class="pill">italic</span><span class="pill">underline</span><span class="pill">strikethrough</span><span class="pill">code</span><span class="pill">pre</span><span class="pill">text_link</span><span class="pill">mention</span><span class="pill">text_mention</span><span class="pill">hashtag</span><span class="pill">custom_emoji</span></div><pre>"entities": [
  {"type": "bold", "offset": 0, "length": 5},
  {"type": "italic", "offset": 6, "length": 6},
  {"type": "text_link", "offset": 13, "length": 4, "url": "https://example.com"},
  {"type": "custom_emoji", "offset": 18, "length": 2, "custom_emoji_id": "5368324170671202286"}
]</pre></article>
<article class="doc-section" id="media"><h3>Media, replies & voice</h3><h4>Media by URL</h4><pre>"media": {"url": "https://example.com/image.jpg"}</pre><h4>Media by Telegram file ID</h4><pre>"media": {"file_id": "AgACAgIAAxkBAAIQ7WR...", "width": 800, "height": 600}</pre><h4>Multiple media</h4><pre>"media": [
  {"file_id": "AgAC..."},
  {"file_id": "AgAD..."}
]</pre><h4>Reply</h4><pre>"replyMessage": {
  "name": "Charlie",
  "text": "How's the weather today?",
  "entities": [],
  "chatId": 123456789
}</pre><h4>Voice waveform</h4><pre>"voice": {"waveform": [0, 4, 8, 16, 12, 8, 4, 8, 16]}</pre></article>
<article class="doc-section" id="output"><h3>Output & responses</h3><h4>JSON endpoint</h4><pre>{
  "ok": true,
  "result": {
    "image": "&lt;base64 string&gt;",
    "type": null,
    "width": 1400,
    "height": 356,
    "ext": null
  }
}</pre><h4>Direct PNG / WebP</h4><p><code>POST /quote/generate.png</code> returns <code>image/png</code>. <code>POST /quote/generate.webp</code> returns <code>image/webp</code>. The response body is the binary image, not JSON.</p><h4>Health</h4><pre>GET /health

{"status":"ok","timestamp":0}</pre></article>
<article class="doc-section" id="features"><h3>Features</h3><div class="feature-grid"><div class="feature"><strong>Multiple messages</strong><span>Combine several messages into one generated image, with grouping for consecutive same-chat messages.</span></div><div class="feature"><strong>Formatting</strong><span>Telegram-style entities for bold, italic, underline, strikethrough, code, links, mentions and custom emoji.</span></div><div class="feature"><strong>Avatars</strong><span>Render sender avatars from image URLs or Telegram file IDs.</span></div><div class="feature"><strong>Replies</strong><span>Display a replied-to message with optional entities and media thumbnail.</span></div><div class="feature"><strong>Media</strong><span>Render URL or Telegram file-ID media, including sticker mode and crop behavior.</span></div><div class="feature"><strong>Voice</strong><span>Render voice-message waveform data.</span></div><div class="feature"><strong>Backgrounds</strong><span>Solid colors, random colors, gradients and semi-transparent color variants.</span></div><div class="feature"><strong>Output modes</strong><span>Raw canvas, framed quote, wallpaper image and 720×1280 stories.</span></div><div class="feature"><strong>PNG / WebP</strong><span>Choose quote format or request direct PNG/WebP output paths.</span></div><div class="feature"><strong>Emoji sets</strong><span>Apple, Google, Twitter, JoyPixels and Blob artwork sets.</span></div><div class="feature"><strong>Scaling</strong><span>Render at scale 1–20 for control over output resolution.</span></div><div class="feature"><strong>Rate limiting</strong><span>Requests are limited per client, with the configured bot token whitelisted.</span></div></div></article>
<article class="doc-section" id="errors"><h3>Errors</h3><p>Validation and routing failures are returned as structured JSON on API errors.</p><pre>{"ok":false,"error":{"code":400,"message":"messages_empty"}}</pre><ul><li><code>query_empty</code> — no request parameters were provided.</li><li><code>messages_empty</code> — <code>messages</code> is missing, not an array, or empty.</li><li><code>empty_messages</code> — no valid message image could be generated.</li><li><code>method not found</code> — the requested API method does not exist.</li><li>HTTP <code>429</code> — rate limit exceeded. Rate-limit headers are included.</li></ul></article>
<article class="doc-section" id="examples"><h3>Examples</h3><h4>JavaScript</h4><pre>const response = await fetch('https://YOUR-DOMAIN/quote/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    backgroundColor: '#f68ac9',
    messages: [{
      from: { id: 1, name: 'User' },
      text: 'Hello world!',
      avatar: false
    }]
  })
})

const data = await response.json()
const image = Buffer.from(data.result.image, 'base64')</pre><h4>Python</h4><pre>import base64
import requests

payload = {
    "messages": [{
        "from": {"id": 1, "name": "User"},
        "text": "Hello world!"
    }]
}

r = requests.post("https://YOUR-DOMAIN/quote/generate", json=payload)
data = r.json()
image = base64.b64decode(data["result"]["image"])</pre></article>
</div></div></section>
</div></main>
<footer><div class="container footer-inner"><span>Quote API — Reimagined</span><span>Self-hosted instance</span></div></footer><div class="toast" id="toast"></div>
<script>
const defaultPayload=document.getElementById('payload').value
const payload=document.getElementById('payload')
const endpoint=document.getElementById('endpoint')
const result=document.getElementById('result')
const resultMeta=document.getElementById('resultMeta')
const resultType=document.getElementById('resultType')
const generate=document.getElementById('generate')
const reset=document.getElementById('reset')
const download=document.getElementById('download')
const toast=document.getElementById('toast')
let downloadUrl=null
function showToast(message){toast.textContent=message;toast.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.remove('show'),2200)}
function setEndpoint(value){endpoint.value=value;document.getElementById('playground').scrollIntoView({behavior:'smooth',block:'start'})}
document.querySelectorAll('[data-endpoint]').forEach(card=>card.addEventListener('click',()=>setEndpoint(card.dataset.endpoint)))
reset.addEventListener('click',()=>{payload.value=defaultPayload;endpoint.value='/quote/generate';result.innerHTML='<div class="placeholder"><strong>No image yet</strong>Run the request to preview the generated quote here.</div>';resultMeta.textContent='—';resultType.textContent='Waiting';download.disabled=true;if(downloadUrl)URL.revokeObjectURL(downloadUrl);downloadUrl=null})
download.addEventListener('click',()=>{if(!downloadUrl)return;const a=document.createElement('a');a.href=downloadUrl;a.download=endpoint.value.endsWith('.webp')?'quote.webp':'quote.png';document.body.appendChild(a);a.click();a.remove()})
generate.addEventListener('click',async()=>{let body;try{body=JSON.parse(payload.value)}catch(error){result.innerHTML='<div class="result-error">Invalid JSON. Check commas, quotes and brackets.</div>';resultMeta.textContent='Invalid JSON';resultType.textContent='Error';return}generate.disabled=true;generate.textContent='Generating…';resultType.textContent='Processing';resultMeta.textContent='Sending request…';result.innerHTML='<div class="placeholder"><strong>Generating image</strong>Please wait while the API renders your request.</div>';download.disabled=true;if(downloadUrl)URL.revokeObjectURL(downloadUrl);downloadUrl=null;try{const response=await fetch(endpoint.value,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const contentType=response.headers.get('content-type')||'';if(!response.ok){const errorText=await response.text();throw new Error(errorText||('HTTP '+response.status))}let blob;if(contentType.includes('image/')){blob=await response.blob()}else{const data=await response.json();if(!data.ok&&data.error)throw new Error(data.error.message||JSON.stringify(data.error));const base64=data.result&&data.result.image;if(!base64)throw new Error(JSON.stringify(data,null,2));const binary=atob(base64);const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);blob=new Blob([bytes],{type:'image/png'})}downloadUrl=URL.createObjectURL(blob);const image=document.createElement('img');image.alt='Generated quote';image.src=downloadUrl;image.onload=()=>{resultMeta.textContent=image.naturalWidth+' × '+image.naturalHeight+' · '+Math.round(blob.size/1024)+' KB'};result.innerHTML='';result.appendChild(image);resultType.textContent=contentType.includes('webp')?'WebP':'PNG';download.disabled=false;showToast('Image generated successfully')}catch(error){result.innerHTML='<div class="result-error">'+String(error.message||error).replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</div>';resultMeta.textContent='Request failed';resultType.textContent='Error'}finally{generate.disabled=false;generate.textContent='Generate image'}})
const docLinks=Array.from(document.querySelectorAll('.docs-nav a'));const docSections=docLinks.map(link=>document.querySelector(link.getAttribute('href'))).filter(Boolean);const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(!entry.isIntersecting)return;docLinks.forEach(link=>link.classList.toggle('active',link.getAttribute('href')==='#'+entry.target.id))})},{rootMargin:'-20% 0px -70% 0px',threshold:0});docSections.forEach(section=>observer.observe(section))
</script>
</body>
</html>`
})

route.get('/health', (ctx) => {
  ctx.status = 200
  ctx.body = { status: 'ok', timestamp: Date.now() }
})

app.use(async (ctx, next) => {
  if (ctx.path === '/' || ctx.path === '/health') return next()
  return require('./helpers').helpersApi(ctx, next)
})

// @koa/router v15 uses path-to-regexp v8, so the wildcard must be named.
route.use('/*path', routes.routeApi.routes())
app.use(route.routes())

const ready = loadFonts()

module.exports = { app, ready }
