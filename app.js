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
  errorMessage: {
    ok: false,
    error: {
      code: 429,
      message: 'Rate limit exceeded. See "Retry-After"'
    }
  },
  id: (ctx) => ctx.ip,
  headers: {
    remaining: 'Rate-Limit-Remaining',
    reset: 'Rate-Limit-Reset',
    total: 'Rate-Limit-Total'
  },
  max: 20,
  disableHeader: false,
  whitelist: (ctx) => {
    const token = ctx.query.botToken || (ctx.request.body && ctx.request.body.botToken)
    return token === process.env.BOT_TOKEN
  },
  blacklist: () => {
  }
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
  <meta name="description" content="Quote API documentation and interactive playground">
  <title>Quote API — Documentation</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #09090b;
      --panel: #111114;
      --panel-2: #151519;
      --border: #27272a;
      --text: #f4f4f5;
      --muted: #a1a1aa;
      --muted-2: #71717a;
      --accent: #fff;
      --green: #86efac;
      --red: #fca5a5;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.6;
    }
    a { color: inherit; text-decoration: none; }
    code, pre, textarea, input, button { font: inherit; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .wrap { width: min(1180px, calc(100% - 40px)); margin: 0 auto; }
    header {
      position: sticky;
      top: 0;
      z-index: 10;
      border-bottom: 1px solid var(--border);
      background: rgba(9,9,11,.86);
      backdrop-filter: blur(14px);
    }
    nav { height: 64px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
    .brand { font-weight: 750; letter-spacing: -.02em; }
    .navlinks { display: flex; gap: 22px; color: var(--muted); font-size: 14px; }
    .navlinks a:hover { color: var(--text); }
    .hero { padding: 86px 0 58px; max-width: 820px; }
    .eyebrow { color: var(--muted); font-size: 13px; font-weight: 650; letter-spacing: .08em; text-transform: uppercase; }
    h1 { font-size: clamp(42px, 7vw, 72px); line-height: 1; letter-spacing: -.055em; margin: 14px 0 20px; }
    .hero p { color: var(--muted); font-size: 18px; max-width: 680px; margin: 0; }
    .status { display: inline-flex; align-items: center; gap: 8px; margin-top: 26px; padding: 7px 11px; border: 1px solid var(--border); border-radius: 999px; color: var(--muted); font-size: 13px; background: var(--panel); }
    .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); }
    section { padding: 34px 0 72px; }
    .section-title { font-size: 27px; letter-spacing: -.025em; margin: 0 0 8px; }
    .section-desc { color: var(--muted); margin: 0 0 25px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .card { border: 1px solid var(--border); border-radius: 14px; background: var(--panel); padding: 20px; }
    .card h3 { margin: 0 0 8px; font-size: 16px; }
    .card p { margin: 0; color: var(--muted); font-size: 14px; }
    .method { display: inline-block; padding: 3px 7px; border-radius: 5px; background: var(--panel-2); color: var(--text); font-size: 11px; font-weight: 800; margin-right: 7px; }
    .endpoint { margin-top: 14px; font-family: ui-monospace, monospace; font-size: 13px; }
    .docs { display: grid; grid-template-columns: 220px minmax(0,1fr); gap: 32px; }
    .side { position: sticky; top: 92px; align-self: start; }
    .side a { display: block; padding: 7px 0; color: var(--muted); font-size: 14px; }
    .side a:hover { color: var(--text); }
    .doc { min-width: 0; }
    .doc-block { margin-bottom: 54px; scroll-margin-top: 90px; }
    .doc h2 { margin: 0 0 10px; font-size: 25px; letter-spacing: -.025em; }
    .doc h3 { margin: 28px 0 10px; font-size: 17px; }
    .doc p, .doc li { color: var(--muted); font-size: 14px; }
    .table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 12px; }
    table { width: 100%; border-collapse: collapse; min-width: 650px; font-size: 13px; }
    th, td { text-align: left; padding: 11px 13px; border-bottom: 1px solid var(--border); vertical-align: top; }
    th { color: var(--text); background: var(--panel-2); font-weight: 650; }
    tr:last-child td { border-bottom: 0; }
    td { color: var(--muted); }
    td code { color: var(--text); }
    pre { margin: 14px 0; padding: 17px; overflow-x: auto; border: 1px solid var(--border); border-radius: 12px; background: #0d0d10; color: #e4e4e7; font-size: 12px; line-height: 1.65; }
    .playground { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 16px; }
    .field { margin-bottom: 14px; }
    label { display: block; margin-bottom: 7px; color: var(--muted); font-size: 13px; font-weight: 600; }
    textarea, input, select {
      width: 100%; border: 1px solid var(--border); border-radius: 9px; background: #0d0d10; color: var(--text); padding: 10px 11px; outline: none;
    }
    textarea { min-height: 330px; resize: vertical; font-family: ui-monospace, monospace; font-size: 12px; line-height: 1.6; }
    textarea:focus, input:focus, select:focus { border-color: #52525b; }
    .controls { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
    button { border: 1px solid var(--border); border-radius: 9px; background: var(--text); color: #09090b; padding: 10px 15px; font-weight: 700; cursor: pointer; }
    button:hover { opacity: .9; }
    button.secondary { background: var(--panel-2); color: var(--text); }
    .actions { display: flex; gap: 9px; margin-top: 14px; }
    .result { min-height: 330px; display: flex; align-items: center; justify-content: center; border: 1px dashed #303037; border-radius: 12px; background: #0d0d10; overflow: hidden; }
    .result img { max-width: 100%; max-height: 520px; display: block; }
    .placeholder { color: var(--muted-2); font-size: 13px; text-align: center; padding: 20px; }
    .error { color: var(--red); white-space: pre-wrap; padding: 20px; font: 12px ui-monospace, monospace; }
    footer { border-top: 1px solid var(--border); padding: 30px 0 45px; color: var(--muted-2); font-size: 13px; }
    @media (max-width: 820px) {
      .grid, .playground { grid-template-columns: 1fr; }
      .docs { grid-template-columns: 1fr; }
      .side { position: static; display: flex; flex-wrap: wrap; gap: 14px; border-bottom: 1px solid var(--border); padding-bottom: 14px; }
      .side a { padding: 0; }
      .navlinks { display: none; }
    }
  </style>
</head>
<body>
  <header>
    <div class="wrap">
      <nav>
        <a class="brand" href="#top">Quote API</a>
        <div class="navlinks">
          <a href="#playground">Playground</a>
          <a href="#documentation">Documentation</a>
          <a href="/health">Health</a>
        </div>
      </nav>
    </div>
  </header>

  <main id="top">
    <div class="wrap">
      <div class="hero">
        <div class="eyebrow">Telegram quote image generator</div>
        <h1>Quote API</h1>
        <p>Generate quote images from Telegram-style messages with avatars, formatting, replies, media, voice waveforms, custom backgrounds and multiple output formats.</p>
        <div class="status"><span class="dot"></span> API is online and ready</div>
      </div>

      <section>
        <h2 class="section-title">Endpoints</h2>
        <p class="section-desc">The API accepts JSON requests and returns generated images or structured results.</p>
        <div class="grid">
          <div class="card"><h3><span class="method">POST</span>/quote/generate</h3><p>Generate a quote and return the image as base64.</p><div class="endpoint">application/json</div></div>
          <div class="card"><h3><span class="method">POST</span>/quote/generate.png</h3><p>Generate a PNG and return the image directly.</p><div class="endpoint">image/png</div></div>
          <div class="card"><h3><span class="method">POST</span>/quote/generate.webp</h3><p>Generate a WebP and return the image directly.</p><div class="endpoint">image/webp</div></div>
        </div>
      </section>

      <section id="playground">
        <h2 class="section-title">Interactive Playground</h2>
        <p class="section-desc">Edit the request body and generate an image directly from your browser.</p>
        <div class="playground">
          <div class="card">
            <div class="field">
              <label for="endpoint">Endpoint</label>
              <select id="endpoint">
                <option value="/quote/generate">POST /quote/generate — base64</option>
                <option value="/quote/generate.png">POST /quote/generate.png — PNG</option>
                <option value="/quote/generate.webp">POST /quote/generate.webp — WebP</option>
              </select>
            </div>
            <div class="field">
              <label for="payload">JSON body</label>
              <textarea id="payload">{
  "backgroundColor": "#1b1429",
  "width": 700,
  "height": 580,
  "scale": 2,
  "emojiBrand": "apple",
  "messages": [
    {
      "from": {
        "id": 1,
        "name": "Test User"
      },
      "text": "Hello world!",
      "avatar": false
    }
  ]
}</textarea>
            </div>
            <div class="actions">
              <button id="generate">Generate image</button>
              <button class="secondary" id="reset" type="button">Reset</button>
            </div>
          </div>
          <div class="card">
            <label>Result</label>
            <div class="result" id="result"><div class="placeholder">Your generated image will appear here.</div></div>
          </div>
        </div>
      </section>

      <section id="documentation">
        <h2 class="section-title">Documentation</h2>
        <p class="section-desc">Everything you need to integrate Quote API into a bot, website or application.</p>
        <div class="docs">
          <aside class="side">
            <a href="#quickstart">Quick start</a>
            <a href="#request">Request</a>
            <a href="#message">Message object</a>
            <a href="#features">Features</a>
            <a href="#responses">Responses</a>
            <a href="#errors">Errors</a>
            <a href="#examples">Examples</a>
          </aside>
          <div class="doc">
            <div class="doc-block" id="quickstart">
              <h2>Quick start</h2>
              <p>The simplest request only needs a <code>messages</code> array containing a sender and text.</p>
              <pre>curl -X POST https://quote-api-inky.vercel.app/quote/generate \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [{
      "from": {"id": 1, "name": "User"},
      "text": "Hello world!"
    }]
  }'</pre>
              <p>The regular endpoint returns a JSON object with the generated image encoded as base64.</p>
            </div>

            <div class="doc-block" id="request">
              <h2>Request parameters</h2>
              <div class="table-wrap"><table><thead><tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr></thead><tbody>
                <tr><td><code>messages</code></td><td>array</td><td>Yes</td><td>Messages to render.</td></tr>
                <tr><td><code>type</code></td><td>string</td><td>No</td><td><code>quote</code>, <code>image</code>, or <code>stories</code>.</td></tr>
                <tr><td><code>format</code></td><td>string</td><td>No</td><td><code>png</code> or <code>webp</code>.</td></tr>
                <tr><td><code>ext</code></td><td>string</td><td>No</td><td><code>png</code> or <code>webp</code> for direct image output.</td></tr>
                <tr><td><code>backgroundColor</code></td><td>string</td><td>No</td><td>HEX, CSS color name, <code>random</code>, or a gradient such as <code>#111/#222</code>.</td></tr>
                <tr><td><code>width</code></td><td>number</td><td>No</td><td>Layout width in pixels before scaling.</td></tr>
                <tr><td><code>height</code></td><td>number</td><td>No</td><td>Layout height in pixels before scaling.</td></tr>
                <tr><td><code>scale</code></td><td>number</td><td>No</td><td>Scaling factor from 1 to 20. Default: <code>2</code>.</td></tr>
                <tr><td><code>emojiBrand</code></td><td>string</td><td>No</td><td>Emoji renderer such as <code>apple</code>, <code>google</code>, or <code>twitter</code>.</td></tr>
                <tr><td><code>botToken</code></td><td>string</td><td>No</td><td>Telegram bot token when Telegram file IDs need to be resolved.</td></tr>
              </tbody></table></div>
            </div>

            <div class="doc-block" id="message">
              <h2>Message object</h2>
              <p>Each item in <code>messages</code> represents one Telegram-style message.</p>
              <div class="table-wrap"><table><thead><tr><th>Field</th><th>Type</th><th>Description</th></tr></thead><tbody>
                <tr><td><code>from</code></td><td>object</td><td>Sender information: <code>id</code>, <code>name</code>, <code>first_name</code>, <code>last_name</code>, <code>username</code>, and optional photo.</td></tr>
                <tr><td><code>text</code></td><td>string</td><td>Message text.</td></tr>
                <tr><td><code>entities</code></td><td>array</td><td>Telegram text entities such as bold, italic, code, links and custom emoji.</td></tr>
                <tr><td><code>avatar</code></td><td>boolean</td><td>Whether the sender avatar is displayed.</td></tr>
                <tr><td><code>replyMessage</code></td><td>object</td><td>Optional replied-to message with name, text, entities, chat ID and sender information.</td></tr>
                <tr><td><code>media</code></td><td>object|array</td><td>Media by URL or Telegram file ID. Multiple media items are supported.</td></tr>
                <tr><td><code>mediaType</code></td><td>string</td><td>Use <code>sticker</code> for sticker media.</td></tr>
                <tr><td><code>mediaCrop</code></td><td>boolean</td><td>Crop media to maintain proportions.</td></tr>
                <tr><td><code>voice</code></td><td>object</td><td>Voice message waveform: <code>{ waveform: [...] }</code>.</td></tr>
              </tbody></table></div>
            </div>

            <div class="doc-block" id="features">
              <h2>Features</h2>
              <div class="grid">
                <div class="card"><h3>Multiple messages</h3><p>Render conversations with multiple senders in one image.</p></div>
                <div class="card"><h3>Text entities</h3><p>Bold, italic, underline, strikethrough, code, links, hashtags and custom emoji.</p></div>
                <div class="card"><h3>Media</h3><p>Use image or sticker media from a URL or Telegram file ID.</p></div>
                <div class="card"><h3>Replies</h3><p>Show the message being replied to above the current message.</p></div>
                <div class="card"><h3>Voice</h3><p>Render voice-message waveforms from waveform data.</p></div>
                <div class="card"><h3>Stories</h3><p>Use <code>type: "stories"</code> for a 720×1280 story layout.</p></div>
                <div class="card"><h3>Gradients</h3><p>Use two colors separated by <code>/</code>, for example <code>#111/#222</code>.</p></div>
                <div class="card"><h3>PNG / WebP</h3><p>Choose the format or use the direct <code>.png</code> and <code>.webp</code> endpoints.</p></div>
                <div class="card"><h3>Emoji brands</h3><p>Render emojis using supported brand sets such as Apple, Google and Twitter.</p></div>
              </div>
            </div>

            <div class="doc-block" id="responses">
              <h2>Responses</h2>
              <h3>Regular endpoint</h3>
              <pre>{
  "ok": true,
  "result": {
    "image": "&lt;base64 string&gt;",
    "type": "quote",
    "width": 512,
    "height": 359,
    "ext": "png"
  }
}</pre>
              <h3>Direct image endpoint</h3>
              <p><code>/quote/generate.png</code> returns <code>image/png</code>. <code>/quote/generate.webp</code> returns <code>image/webp</code>.</p>
            </div>

            <div class="doc-block" id="errors">
              <h2>Errors</h2>
              <pre>{"ok":false,"error":{"code":400,"message":"messages_empty"}}</pre>
              <p>Common validation errors include <code>query_empty</code>, <code>messages_empty</code>, and <code>empty_messages</code>. Requests can also receive HTTP 429 when the rate limit is exceeded.</p>
            </div>

            <div class="doc-block" id="examples">
              <h2>Examples</h2>
              <h3>JavaScript</h3>
              <pre>const response = await fetch('/quote/generate', {
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
const buffer = Buffer.from(data.result.image, 'base64')</pre>
              <h3>Python</h3>
              <pre>import requests
import base64

payload = {
    "messages": [{
        "from": {"id": 1, "name": "User"},
        "text": "Hello world!"
    }]
}

r = requests.post('/quote/generate', json=payload)
data = r.json()
image = base64.b64decode(data['result']['image'])</pre>
            </div>
          </div>
        </div>
      </section>
    </div>
  </main>

  <footer>
    <div class="wrap">Quote API · Self-hosted instance</div>
  </footer>

  <script>
    const defaultPayload = document.getElementById('payload').value
    const payload = document.getElementById('payload')
    const endpoint = document.getElementById('endpoint')
    const result = document.getElementById('result')
    const generate = document.getElementById('generate')
    const reset = document.getElementById('reset')

    reset.addEventListener('click', () => {
      payload.value = defaultPayload
      result.innerHTML = '<div class="placeholder">Your generated image will appear here.</div>'
    })

    generate.addEventListener('click', async () => {
      let body
      try {
        body = JSON.parse(payload.value)
      } catch (error) {
        result.innerHTML = '<div class="error">Invalid JSON. Please check the request body.</div>'
        return
      }

      generate.disabled = true
      generate.textContent = 'Generating...'
      result.innerHTML = '<div class="placeholder">Generating image...</div>'

      try {
        const response = await fetch(endpoint.value, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })

        const type = response.headers.get('content-type') || ''

        if (!response.ok) {
          const text = await response.text()
          throw new Error(text || ('HTTP ' + response.status))
        }

        if (type.includes('image/')) {
          const blob = await response.blob()
          const url = URL.createObjectURL(blob)
          result.innerHTML = '<img alt="Generated quote" src="' + url + '">'
        } else {
          const data = await response.json()
          const base64 = data.result && data.result.image
          if (!base64) throw new Error(JSON.stringify(data, null, 2))
          result.innerHTML = '<img alt="Generated quote" src="data:image/png;base64,' + base64 + '">'
        }
      } catch (error) {
        result.innerHTML = '<div class="error">' + String(error.message || error) + '</div>'
      } finally {
        generate.disabled = false
        generate.textContent = 'Generate image'
      }
    })
  </script>
</body>
</html>`
})

route.get('/health', (ctx) => {
  ctx.status = 200
  ctx.body = { status: 'ok', timestamp: Date.now() }
})

// The legacy result formatter must not intercept the public landing page
// or health endpoint. It is still applied to the actual API routes.
app.use(async (ctx, next) => {
  if (ctx.path === '/' || ctx.path === '/health') return next()
  return require('./helpers').helpersApi(ctx, next)
})

// @koa/router v15 uses path-to-regexp v8, where the old /* wildcard is invalid.
// Use a named wildcard for the nested API router instead.
route.use('/*path', routes.routeApi.routes())
app.use(route.routes())

const ready = loadFonts()

module.exports = { app, ready }
