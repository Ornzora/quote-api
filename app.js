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
  driver: 'memory', db: ratelimitDb, duration: 1000 * 55,
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
<meta name="description" content="Quote API — reimagined Telegram-style quote image generation API.">
<title>Quote API — Reimagined</title>
<style>
:root{color-scheme:dark;--bg:#0a0a0b;--panel:#111113;--panel2:#151517;--line:#27272a;--line2:#3f3f46;--text:#f4f4f5;--muted:#a1a1aa;--dim:#71717a;--ok:#86efac;--bad:#fda4af;--max:1180px}
*{box-sizing:border-box}html{scroll-behavior:smooth;scrollbar-width:none}html::-webkit-scrollbar,body::-webkit-scrollbar,pre::-webkit-scrollbar,.table-scroll::-webkit-scrollbar{display:none;width:0;height:0}body{margin:0;min-width:320px;overflow-x:hidden;background:var(--bg);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.55;scrollbar-width:none}a{color:inherit;text-decoration:none}button,input,select,textarea{font:inherit}button{cursor:pointer}code,pre,textarea,.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace}::selection{background:#3f3f46;color:#fff}.wrap{width:min(var(--max),calc(100% - 44px));margin:auto}.muted{color:var(--muted)}
header{position:sticky;top:0;z-index:20;height:62px;border-bottom:1px solid var(--line);background:rgba(10,10,11,.94);backdrop-filter:blur(10px)}nav{height:100%;display:flex;align-items:center;justify-content:space-between}.brand{display:flex;align-items:center;gap:10px;font-size:14px;font-weight:760}.mark{width:27px;height:27px;display:grid;place-items:center;border:1px solid #d4d4d8;border-radius:8px;background:#f4f4f5;color:#09090b;font-size:12px;font-weight:900}.nav{display:flex;gap:4px}.nav a{padding:7px 10px;border-radius:7px;color:var(--muted);font-size:12px}.nav a:hover{background:var(--panel2);color:var(--text)}.nav .health{border:1px solid var(--line);color:var(--text)}
.hero{padding:92px 0 78px;max-width:850px}.eyebrow{margin-bottom:13px;color:var(--dim);font-size:10px;font-weight:800;letter-spacing:.15em;text-transform:uppercase}.hero h1{margin:0;font-size:clamp(50px,7.5vw,86px);line-height:.96;letter-spacing:-.065em}.hero h1 span{color:var(--muted);font-weight:500}.hero p{max-width:690px;margin:20px 0 0;color:var(--muted);font-size:16px;line-height:1.75}.hero-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:25px}.btn{display:inline-flex;align-items:center;justify-content:center;min-height:39px;padding:8px 13px;border:1px solid var(--line);border-radius:8px;background:var(--panel2);color:var(--text);font-size:12px;font-weight:700}.btn:hover{border-color:var(--line2)}.btn.primary{background:#f4f4f5;border-color:#f4f4f5;color:#09090b}.status{display:inline-flex;align-items:center;gap:7px;min-height:39px;padding:8px 11px;border:1px solid var(--line);border-radius:999px;color:var(--muted);font-size:11px}.dot{width:6px;height:6px;border-radius:50%;background:var(--ok)}
.section{padding:42px 0 76px;scroll-margin-top:75px}.section-head{margin-bottom:20px}.eyebrow2{color:var(--dim);font-size:10px;font-weight:800;letter-spacing:.13em;text-transform:uppercase}.section h2{margin:6px 0 0;font-size:30px;line-height:1.15;letter-spacing:-.04em}.section-head p{max-width:700px;margin:7px 0 0;color:var(--muted);font-size:12px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.card{padding:19px;border:1px solid var(--line);border-radius:11px;background:var(--panel);transition:.16s}.card:hover{border-color:var(--line2);transform:translateY(-1px)}.method{display:inline-flex;padding:3px 6px;border-radius:5px;background:#17231b;color:var(--ok);font-size:9px;font-weight:800}.path{margin:12px 0 6px;font-size:13px;font-weight:750}.card p{margin:0;color:var(--muted);font-size:11px}.type{margin-top:12px;color:var(--dim);font-size:10px}
.play{display:grid;grid-template-columns:1fr 1fr;gap:10px}.panel{min-width:0;border:1px solid var(--line);border-radius:11px;background:var(--panel);overflow:hidden}.panel-head{min-height:49px;padding:11px 14px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between}.panel-head strong{font-size:12px}.panel-head small{color:var(--dim);font-size:10px}.panel-body{padding:14px}.field{margin-bottom:11px}label{display:block;margin-bottom:5px;color:var(--muted);font-size:10px;font-weight:700}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:9px}input,select,textarea{width:100%;border:1px solid var(--line);border-radius:7px;outline:0;background:#0d0d0f;color:var(--text)}input,select{height:36px;padding:0 9px;font-size:11px}textarea{min-height:330px;padding:11px;resize:vertical;font-size:10px;line-height:1.65}input:focus,select:focus,textarea:focus{border-color:#52525b}.check{display:flex;align-items:center;gap:7px;min-height:36px;padding:0 9px;border:1px solid var(--line);border-radius:7px;background:#0d0d0f;color:var(--muted);font-size:10px}.check input{width:auto;height:auto}.actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:4px}.actions .btn{min-height:36px}.preview{min-height:404px;display:flex;align-items:center;justify-content:center;padding:16px;border:1px dashed #303036;border-radius:8px;background:#0d0d0f;overflow:hidden}.preview img{display:block;max-width:100%;max-height:540px;width:auto;height:auto;border-radius:4px}.empty{text-align:center;color:var(--dim);font-size:11px}.empty strong{display:block;margin-bottom:4px;color:var(--muted);font-size:12px}.resultbar{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:35px;color:var(--dim);font-size:10px}.mini{padding:5px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel2);color:var(--muted);font-size:10px}.error{max-width:100%;color:var(--bad);font-size:10px;overflow-wrap:anywhere;white-space:pre-wrap}
.docs{display:grid;grid-template-columns:175px minmax(0,1fr);gap:38px;align-items:start}.docnav{position:sticky;top:82px;border-left:1px solid var(--line);padding-left:13px}.docnav a{display:block;padding:4px 0;color:var(--dim);font-size:11px}.docnav a:hover,.docnav a.active{color:var(--text)}.doc{min-width:0}.docsec{margin-bottom:52px;scroll-margin-top:82px}.docsec:last-child{margin-bottom:0}.doc h3{margin:0 0 8px;font-size:21px;letter-spacing:-.03em}.doc h4{margin:22px 0 7px;font-size:13px}.doc p,.doc li{color:var(--muted);font-size:11px}.doc ul{margin:7px 0;padding-left:18px}.doc code,.doc p code,.doc li code{padding:2px 4px;border-radius:4px;background:var(--panel2);color:#d4d4d8;font-size:.92em}.table-scroll{overflow-x:auto;border:1px solid var(--line);border-radius:8px}table{width:100%;min-width:650px;border-collapse:collapse;font-size:10px}th,td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{background:var(--panel2);color:var(--text);font-weight:700}td{color:var(--muted)}tr:last-child td{border:0}pre{margin:10px 0 0;padding:11px;overflow-x:auto;border:1px solid var(--line);border-radius:8px;background:#0d0d0f;color:#d4d4d8;font-size:9.5px;line-height:1.65;white-space:pre;scrollbar-width:none}.note{margin-top:10px;padding:10px 11px;border-left:2px solid #52525b;background:var(--panel);color:var(--muted);font-size:10px}.features{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.feature{padding:12px;border:1px solid var(--line);border-radius:8px;background:var(--panel)}.feature b{display:block;margin-bottom:3px;font-size:11px}.feature span{color:var(--muted);font-size:10px}.pills{display:flex;flex-wrap:wrap;gap:5px}.pill{padding:4px 7px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--muted);font-size:9px}
footer{margin-top:70px;border-top:1px solid var(--line)}.foot{min-height:65px;display:flex;align-items:center;justify-content:space-between;color:var(--dim);font-size:10px}.toast{position:fixed;right:16px;bottom:16px;z-index:30;padding:8px 11px;border:1px solid var(--line);border-radius:7px;background:var(--panel2);font-size:10px;opacity:0;transform:translateY(6px);transition:.16s}.toast.show{opacity:1;transform:none}
@media(max-width:900px){.cards,.features{grid-template-columns:1fr}.play{grid-template-columns:1fr}.docs{grid-template-columns:1fr;gap:20px}.docnav{position:static;display:flex;flex-wrap:wrap;gap:5px 14px;border-left:0;border-bottom:1px solid var(--line);padding:0 0 10px}.preview{min-height:350px}}
@media(max-width:600px){.wrap{width:calc(100% - 28px)}header{height:57px}.nav a:not(.health){display:none}.hero{padding:62px 0 50px}.hero h1{font-size:clamp(45px,15vw,65px)}.hero p{font-size:14px}.section{padding:35px 0 55px}.grid2{grid-template-columns:1fr}textarea{min-height:270px}.preview{min-height:290px}.foot{padding:15px 0;display:block}.foot div+div{margin-top:4px}}
</style>
</head>
<body>
<header><div class="wrap"><nav><a class="brand" href="#top"><span class="mark">Q</span>Quote API</a><div class="nav"><a href="#playground">Playground</a><a href="#documentation">Docs</a><a class="health" href="/health">Health</a></div></nav></div></header>
<main id="top">
<div class="wrap">
<section class="hero"><div class="eyebrow">Telegram quote image generator</div><h1>Quote API <span>reimagined.</span></h1><p>Turn Telegram-style messages into polished quote images through a small, self-hostable API. Build the message, identity, avatar, formatting, media and output you need.</p><div class="hero-actions"><a class="btn primary" href="#playground">Open playground</a><a class="btn" href="#documentation">Documentation</a><span class="status"><span class="dot"></span>API online</span></div></section>
<section class="section" id="endpoints"><div class="section-head"><div class="eyebrow2">API surface</div><h2>Endpoints</h2><p>Choose JSON/base64 output or request the image bytes directly.</p></div><div class="cards">
<a class="card endpoint" href="#playground" data-endpoint="/quote/generate"><span class="method">POST</span><div class="path mono">/quote/generate</div><p>Returns a JSON result containing the generated image as base64.</p><div class="type mono">application/json</div></a>
<a class="card endpoint" href="#playground" data-endpoint="/quote/generate.png"><span class="method">POST</span><div class="path mono">/quote/generate.png</div><p>Returns the generated PNG image directly.</p><div class="type mono">image/png</div></a>
<a class="card endpoint" href="#playground" data-endpoint="/quote/generate.webp"><span class="method">POST</span><div class="path mono">/quote/generate.webp</div><p>Returns the generated WebP image directly.</p><div class="type mono">image/webp</div></a>
</div></section>
<section class="section" id="playground"><div class="section-head"><div class="eyebrow2">Build a request</div><h2>Playground</h2><p>Fill in the common fields below. The request JSON is generated for you, so you can use it as a starting point for your bot or app.</p></div><div class="play">
<div class="panel"><div class="panel-head"><strong>Request</strong><small id="endpoint-label">/quote/generate</small></div><div class="panel-body">
<div class="field"><label>Endpoint</label><select id="endpoint"><option>/quote/generate</option><option>/quote/generate.png</option><option>/quote/generate.webp</option></select></div>
<div class="grid2"><div class="field"><label>Name</label><input id="name" value="Test User" maxlength="120"></div><div class="field"><label>User ID</label><input id="uid" value="1" inputmode="numeric"></div></div>
<div class="field"><label>Message text</label><textarea id="text" style="min-height:86px;resize:vertical">Hello world!</textarea></div>
<div class="field"><label>Avatar URL</label><input id="avatar" placeholder="Uses the default avatar when empty"></div>
<div class="grid2"><label class="check"><input id="showAvatar" type="checkbox" checked> Show avatar</label><div class="field"><label>Emoji brand</label><select id="emoji"><option>apple</option><option>google</option><option>twitter</option><option>joypixels</option><option>blob</option></select></div></div>
<div class="grid2"><div class="field"><label>Background</label><input id="bg" value="#f68ac9"></div><div class="field"><label>Format</label><select id="format"><option>png</option><option>webp</option></select></div></div>
<div class="grid2"><div class="field"><label>Width</label><input id="width" value="700" inputmode="numeric"></div><div class="field"><label>Height</label><input id="height" value="580" inputmode="numeric"></div></div>
<div class="grid2"><div class="field"><label>Scale (1–20)</label><input id="scale" value="2" inputmode="numeric"></div><div class="field"><label>Media URL (optional)</label><input id="media" placeholder="https://..."></div></div>
<div class="grid2"><div class="field"><label>Reply name (optional)</label><input id="replyName"></div><div class="field"><label>Reply text (optional)</label><input id="replyText"></div></div>
<div class="actions"><button class="btn primary" id="generate">Generate image</button><button class="btn" id="reset">Reset</button></div>
</div></div>
<div class="panel"><div class="panel-head"><strong>Preview</strong><small id="result-status">WAITING</small></div><div class="panel-body"><div class="preview" id="preview"><div class="empty"><strong>No image yet</strong>Generate a request to see the result here.</div></div><div class="resultbar"><span id="result-info">Ready when you are.</span><button class="mini" id="download" hidden>Download image</button></div></div></div>
</div></section>
<section class="section" id="documentation"><div class="section-head"><div class="eyebrow2">Reference</div><h2>Documentation</h2><p>Everything supported by the current generator, including request fields, message objects, formatting, media, output modes and examples.</p></div>
<div class="docs"><aside class="docnav"><a href="#quickstart">Quick start</a><a href="#request">Request</a><a href="#message">Message</a><a href="#entities">Entities</a><a href="#reply">Reply</a><a href="#media">Media</a><a href="#voice">Voice</a><a href="#output">Output</a><a href="#background">Background</a><a href="#emoji">Emoji</a><a href="#features">Features</a><a href="#errors">Errors</a><a href="#examples">Examples</a></aside>
<article class="doc">
<section class="docsec" id="quickstart"><h3>Quick start</h3><p>Send JSON to <code>POST /quote/generate</code>. The deployed route is exposed under <code>/quote</code>; the original generator method is <code>/generate</code>.</p><pre>curl -X POST https://YOUR-DOMAIN/quote/generate \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [{
      "from": { "id": 1, "name": "Test User" },
      "text": "Hello world!",
      "avatar": true
    }]
  }'</pre><div class="note">For the public playground, no bot token is required unless your deployment is configured to require one. Authenticated calls can pass <code>botToken</code>; the server also accepts <code>BOT_TOKEN</code> from the environment.</div></section>
<section class="docsec" id="request"><h3>Request parameters</h3><p>Content-Type must be <code>application/json</code>. Only <code>messages</code> is required.</p><div class="table-scroll"><table><thead><tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr></thead><tbody>
<tr><td><code>botToken</code></td><td>string</td><td>No</td><td>Telegram bot token. Falls back to <code>BOT_TOKEN</code>.</td></tr><tr><td><code>type</code></td><td>string</td><td>No</td><td><code>quote</code>, <code>image</code>, or <code>stories</code>. Stories uses 720×1280 output.</td></tr><tr><td><code>format</code></td><td>string</td><td>No</td><td><code>png</code> or <code>webp</code> for quote output.</td></tr><tr><td><code>ext</code></td><td>string</td><td>No</td><td><code>png</code>/<code>webp</code>; selects direct image response handling.</td></tr><tr><td><code>backgroundColor</code></td><td>string</td><td>No</td><td>HEX, CSS color name, <code>random</code>, gradient using <code>#111/#222</code>, or <code>//</code> for a transparent variant.</td></tr><tr><td><code>width</code></td><td>number</td><td>No</td><td>Layout width before scaling.</td></tr><tr><td><code>height</code></td><td>number</td><td>No</td><td>Layout height before scaling.</td></tr><tr><td><code>scale</code></td><td>number</td><td>No</td><td>Scaling factor from 1 to 20. Default is 2.</td></tr><tr><td><code>emojiBrand</code></td><td>string</td><td>No</td><td>Emoji rendering set, such as apple, google, twitter, joypixels, or blob.</td></tr><tr><td><code>messages</code></td><td>array</td><td>Yes</td><td>One or more message objects.</td></tr>
</tbody></table></div></section>
<section class="docsec" id="message"><h3>Message object</h3><p>Messages can represent one person or a full conversation.</p><div class="table-scroll"><table><thead><tr><th>Field</th><th>Type</th><th>Description</th></tr></thead><tbody>
<tr><td><code>from</code></td><td>object</td><td>Sender: <code>id</code>, <code>first_name</code>, <code>last_name</code>, <code>name</code>, <code>username</code>, and optional <code>photo.url</code>/<code>photo.big_file_id</code>.</td></tr><tr><td><code>text</code></td><td>string</td><td>Message text, up to 4096 characters.</td></tr><tr><td><code>entities</code></td><td>array</td><td>Telegram-style formatting entities.</td></tr><tr><td><code>avatar</code></td><td>boolean</td><td>Whether the avatar is shown.</td></tr><tr><td><code>replyMessage</code></td><td>object</td><td>Quoted/replied message shown above the message.</td></tr><tr><td><code>media</code></td><td>object|array</td><td>Image/sticker/media source. URL or Telegram file ID.</td></tr><tr><td><code>mediaType</code></td><td>string</td><td><code>sticker</code> for stickers; otherwise text/image.</td></tr><tr><td><code>mediaCrop</code></td><td>boolean</td><td>Crop media to preserve the requested proportions.</td></tr><tr><td><code>voice</code></td><td>object</td><td>Voice message waveform, e.g. <code>{ waveform: [0,4,8] }</code>.</td></tr></tbody></table></div></section>
<section class="docsec" id="entities"><h3>Text entities</h3><p>Use Telegram entity objects with <code>type</code>, <code>offset</code>, and <code>length</code>. Some entity types also accept extra data.</p><div class="pills"><span class="pill">bold</span><span class="pill">italic</span><span class="pill">underline</span><span class="pill">strikethrough</span><span class="pill">code</span><span class="pill">text_link</span><span class="pill">hashtag</span><span class="pill">custom_emoji</span></div><pre>"entities": [
  { "type": "bold", "offset": 0, "length": 5 },
  { "type": "italic", "offset": 6, "length": 5 },
  { "type": "text_link", "offset": 12, "length": 4, "url": "https://example.com" },
  { "type": "custom_emoji", "offset": 17, "length": 2, "custom_emoji_id": "..." }
]</pre></section>
<section class="docsec" id="reply"><h3>Reply messages</h3><p>Set <code>replyMessage</code> to display a short quoted message above the current message. It can include <code>name</code>, <code>text</code>, <code>entities</code>, <code>chatId</code>, and optional <code>from</code> sender information.</p></section>
<section class="docsec" id="media"><h3>Media</h3><p>Media accepts a URL or Telegram file ID. An array can contain multiple files; the generator uses the last file, or the second file when <code>mediaCrop</code> is enabled.</p><pre>"media": { "url": "https://example.com/image.jpg" }

"media": { "file_id": "AgACAg...", "width": 800, "height": 600 }

"media": [
  { "file_id": "AgACAg...1" },
  { "file_id": "AgACAg...2" }
]</pre></section>
<section class="docsec" id="voice"><h3>Voice messages</h3><p>Provide waveform samples as numbers. The renderer turns them into a visual waveform.</p><pre>"voice": {
  "waveform": [0, 4, 8, 16, 12, 8, 4, 8, 16, 12, 8, 4, 0]
}</pre></section>
<section class="docsec" id="output"><h3>Output formats</h3><p>There are three practical endpoint forms:</p><ul><li><code>/quote/generate</code> — JSON containing the generated image as base64.</li><li><code>/quote/generate.png</code> — direct PNG response.</li><li><code>/quote/generate.webp</code> — direct WebP response.</li></ul><p>The generated result also reports its actual width, height, type and extension.</p></section>
<section class="docsec" id="background"><h3>Backgrounds & layout</h3><p><code>backgroundColor</code> accepts HEX values and CSS color names. Use <code>random</code> for a random background, or two colors separated by a slash for a gradient such as <code>#ff69b4/#6cace4</code>. A value beginning with <code>//</code> creates a semi-transparent variant. Set <code>width</code>, <code>height</code>, and <code>scale</code> to control the render size.</p></section>
<section class="docsec" id="emoji"><h3>Emoji brands</h3><p>The bundled emoji sets currently include:</p><div class="pills"><span class="pill">apple</span><span class="pill">google</span><span class="pill">twitter</span><span class="pill">joypixels</span><span class="pill">blob</span></div></section>
<section class="docsec" id="features"><h3>Features at a glance</h3><div class="features"><div class="feature"><b>Multiple messages</b><span>Compose conversations in one image.</span></div><div class="feature"><b>Custom identity</b><span>Name, username, ID and avatar source.</span></div><div class="feature"><b>Text formatting</b><span>Telegram-style entities and links.</span></div><div class="feature"><b>Replies</b><span>Show quoted context above a message.</span></div><div class="feature"><b>Media</b><span>URL, file ID, multiple files and cropping.</span></div><div class="feature"><b>Voice</b><span>Render waveform data as a voice message.</span></div><div class="feature"><b>Stories</b><span>720×1280 story layout.</span></div><div class="feature"><b>PNG / WebP</b><span>Base64 JSON or direct image output.</span></div><div class="feature"><b>Emoji sets</b><span>Apple, Google, Twitter, JoyPixels and Blob.</span></div></div></section>
<section class="docsec" id="errors"><h3>Errors & limits</h3><p>Common validation errors include <code>query_empty</code>, <code>messages_empty</code>, and <code>empty_messages</code>. Unknown methods return <code>method not found</code>. The API rate limit is 20 requests per IP per 55-second window; calls matching the configured <code>BOT_TOKEN</code> are whitelisted.</p><pre>{
  "ok": false,
  "error": {
    "code": 429,
    "message": "Rate limit exceeded. See \"Retry-After\""
  }
}</pre></section>
<section class="docsec" id="examples"><h3>Examples</h3><h4>JavaScript</h4><pre>const response = await fetch('https://YOUR-DOMAIN/quote/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    backgroundColor: '#f68ac9',
    scale: 2,
    messages: [{
      from: {
        id: 1,
        name: 'Test User',
        photo: { url: 'https://YOUR-DOMAIN/default-avatar.svg' }
      },
      avatar: true,
      text: 'Hello world!'
    }]
  })
})
const data = await response.json()
const image = Buffer.from(data.result.image, 'base64')</pre><h4>Python</h4><pre>import base64, requests

payload = {
  'messages': [{
    'from': {'id': 1, 'name': 'Test User'},
    'text': 'Hello world!',
    'avatar': True
  }]
}
r = requests.post('https://YOUR-DOMAIN/quote/generate', json=payload)
data = r.json()
image = base64.b64decode(data['result']['image'])
open('quote.png', 'wb').write(image)</pre></section>
</article></div></section>
</div></main>
<footer><div class="wrap foot"><div>Quote API — Reimagined</div><div>Self-hostable Telegram-style quote image generation</div></div></footer>
<div class="toast" id="toast"></div>
<script>
const $=id=>document.getElementById(id)
const endpoint=$('endpoint'), label=$('endpoint-label'), preview=$('preview'), status=$('result-status'), info=$('result-info'), download=$('download'), toast=$('toast')
let objectUrl=null
const defaultAvatar=()=>location.origin+'/default-avatar.svg'
function notify(s){toast.textContent=s;toast.classList.add('show');clearTimeout(notify.t);notify.t=setTimeout(()=>toast.classList.remove('show'),1800)}
function number(id,fallback){const n=Number($(id).value);return Number.isFinite(n)?n:fallback}
function payload(){
  const msg={from:{id:number('uid',1),name:$('name').value.trim()||'Test User'},text:$('text').value}
  msg.avatar=$('showAvatar').checked
  const av=$('avatar').value.trim()||defaultAvatar()
  if(av)msg.from.photo={url:av}
  const rn=$('replyName').value.trim(),rt=$('replyText').value.trim()
  if(rn||rt)msg.replyMessage={name:rn||'Unknown',text:rt||''}
  const media=$('media').value.trim()
  if(media)msg.media={url:media}
  return {backgroundColor:$('bg').value.trim()||'#ffffff',width:number('width',700),height:number('height',580),scale:Math.min(20,Math.max(1,number('scale',2))),emojiBrand:$('emoji').value,format:$('format').value,messages:[msg]}
}
function setEndpoint(v){endpoint.value=v;label.textContent=v;if(v.endsWith('.png'))$('format').value='png';if(v.endsWith('.webp'))$('format').value='webp'}
endpoint.addEventListener('change',()=>setEndpoint(endpoint.value))
document.querySelectorAll('.endpoint').forEach(el=>el.addEventListener('click',()=>setEndpoint(el.dataset.endpoint)))
$('generate').addEventListener('click',async()=>{
  status.textContent='GENERATING';info.textContent='Sending request…';download.hidden=true;preview.innerHTML='<div class="empty">Generating…</div>'
  if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null}
  try{
    const res=await fetch(endpoint.value,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload())})
    const type=res.headers.get('content-type')||''
    if(!res.ok)throw new Error(await res.text())
    let blob
    if(type.includes('application/json')){
      const data=await res.json();if(!data.ok)throw new Error(JSON.stringify(data,null,2));const b64=data.result.image;blob=await (await fetch('data:image/'+(data.result.ext||'png')+';base64,'+b64)).blob();info.textContent=(data.result.width||'?')+' × '+(data.result.height||'?')+' · '+(data.result.ext||'image')
    }else{blob=await res.blob();info.textContent=(blob.type||'image')+' · '+Math.round(blob.size/1024)+' KB'}
    objectUrl=URL.createObjectURL(blob);const img=document.createElement('img');img.src=objectUrl;img.alt='Generated quote image';preview.innerHTML='';preview.appendChild(img);download.hidden=false;status.textContent='READY';notify('Image generated')
  }catch(e){status.textContent='ERROR';info.textContent='Request failed';preview.innerHTML='<div class="error">'+String(e.message||e)+'</div>'}
})
download.addEventListener('click',()=>{if(!objectUrl)return;const a=document.createElement('a');a.href=objectUrl;a.download=endpoint.value.endsWith('.webp')?'quote.webp':'quote.png';a.click()})
$('reset').addEventListener('click',()=>{ $('name').value='Test User';$('uid').value='1';$('text').value='Hello world!';$('avatar').value='';$('showAvatar').checked=true;$('bg').value='#f68ac9';$('width').value='700';$('height').value='580';$('scale').value='2';$('media').value='';$('replyName').value='';$('replyText').value='';$('emoji').value='apple';setEndpoint('/quote/generate');status.textContent='WAITING';info.textContent='Ready when you are.';download.hidden=true;preview.innerHTML='<div class="empty"><strong>No image yet</strong>Generate a request to see the result here.</div>';if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null}})
const sections=[...document.querySelectorAll('.docsec')],links=[...document.querySelectorAll('.docnav a')]
const io=new IntersectionObserver(es=>{const e=es.filter(x=>x.isIntersecting)[0];if(!e)return;links.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+e.target.id))},{rootMargin:'-20% 0px -65% 0px'});sections.forEach(s=>io.observe(s))
</script>
</body></html>`
})

route.get('/default-avatar.svg', (ctx) => {
  ctx.status = 200
  ctx.type = 'image/svg+xml'
  ctx.body = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1254 1254"><rect width="1254" height="1254" fill="#fff"/><path d="M256 610C250 470 285 350 405 290C490 248 575 250 629 251C770 246 914 290 974 401C1026 497 1040 620 1018 727C993 848 913 948 798 983C680 1019 548 1002 442 947C325 887 267 785 256 610Z" fill="#fff" stroke="#000" stroke-width="47" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="437" cy="407" rx="31" ry="43" fill="#000" transform="rotate(9 437 407)"/><ellipse cx="850" cy="462" rx="31" ry="43" fill="#000" transform="rotate(9 850 462)"/><path d="M588 866C632 866 680 869 724 876" fill="none" stroke="#000" stroke-width="40" stroke-linecap="round"/></svg>'
})

app.use(async (ctx, next) => {
  if (ctx.path === '/' || ctx.path === '/health' || ctx.path === '/default-avatar.svg') return next()
  return require('./helpers').helpersApi(ctx, next)
})
route.get('/health', (ctx) => { ctx.status = 200; ctx.body = { status: 'ok', timestamp: Date.now() } })
route.use('/*path', routes.routeApi.routes())
app.use(route.routes())

const ready = loadFonts()
module.exports = { app, ready }
