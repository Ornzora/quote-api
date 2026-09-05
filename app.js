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
  <meta name="description" content="Quote API — a modern Telegram-style quote image generator API.">
  <title>Quote API — Reimagined</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #070709;
      --bg-soft: #0b0b0f;
      --panel: rgba(17,17,22,.78);
      --panel-solid: #111116;
      --panel-hover: #16161c;
      --line: rgba(255,255,255,.09);
      --line-strong: rgba(255,255,255,.15);
      --text: #f5f5f7;
      --muted: #a0a0aa;
      --subtle: #6f707b;
      --white: #fff;
      --green: #8df0b1;
      --red: #ff8d9b;
      --purple: #b49cff;
      --cyan: #7dd3fc;
      --shadow: 0 24px 80px rgba(0,0,0,.42);
      --radius: 18px;
    }

    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; scrollbar-width: none; }
    html::-webkit-scrollbar, body::-webkit-scrollbar { display: none; width: 0; height: 0; }
    body {
      margin: 0;
      min-width: 320px;
      overflow-x: hidden;
      background:
        radial-gradient(900px 500px at 75% -5%, rgba(123,97,255,.13), transparent 65%),
        radial-gradient(700px 420px at 5% 20%, rgba(61,189,255,.06), transparent 70%),
        var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.6;
      scrollbar-width: none;
    }
    body::-webkit-scrollbar { display: none; }
    a { color: inherit; text-decoration: none; }
    button, input, select, textarea { font: inherit; }
    button { -webkit-tap-highlight-color: transparent; }
    ::selection { background: rgba(180,156,255,.28); color: #fff; }

    .shell { width: min(1320px, calc(100% - 48px)); margin: 0 auto; }
    .noise {
      position: fixed;
      inset: 0;
      pointer-events: none;
      opacity: .018;
      z-index: 50;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.65'/%3E%3C/svg%3E");
    }

    header {
      position: sticky;
      top: 0;
      z-index: 40;
      border-bottom: 1px solid var(--line);
      background: rgba(7,7,9,.72);
      backdrop-filter: blur(18px) saturate(130%);
    }
    nav { height: 68px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
    .brand { display: inline-flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 760; letter-spacing: -.025em; }
    .brand-mark {
      width: 27px; height: 27px; display: grid; place-items: center; border-radius: 8px;
      background: linear-gradient(145deg,#fff,#a9a1ff 70%); color: #09090b; font-size: 13px; font-weight: 900;
      box-shadow: 0 0 28px rgba(180,156,255,.22);
    }
    .navlinks { display: flex; align-items: center; gap: 4px; }
    .navlinks a { padding: 8px 12px; border-radius: 9px; color: var(--muted); font-size: 13px; transition: .2s ease; }
    .navlinks a:hover { color: var(--text); background: rgba(255,255,255,.055); }
    .nav-cta { border: 1px solid var(--line-strong) !important; color: var(--text) !important; background: rgba(255,255,255,.045); }
    .mobile-nav { display: none; }

    .hero { position: relative; padding: 104px 0 92px; max-width: 900px; }
    .hero::before {
      content: ""; position: absolute; width: 420px; height: 420px; left: 8%; top: 0; border-radius: 50%;
      background: radial-gradient(circle, rgba(145,111,255,.11), transparent 68%); filter: blur(10px); pointer-events: none;
    }
    .eyebrow { position: relative; display: inline-flex; align-items: center; gap: 8px; color: #c5c5ce; font-size: 11px; font-weight: 760; letter-spacing: .14em; text-transform: uppercase; }
    .eyebrow::before { content: ""; width: 24px; height: 1px; background: linear-gradient(90deg,var(--purple),transparent); }
    h1 { position: relative; margin: 17px 0 18px; max-width: 850px; font-size: clamp(54px, 8vw, 104px); line-height: .93; letter-spacing: -.075em; font-weight: 800; }
    h1 span { color: transparent; background: linear-gradient(110deg,#fff 20%,#c8c0ff 60%,#8edcff); -webkit-background-clip: text; background-clip: text; }
    .hero-copy { position: relative; max-width: 720px; margin: 0; color: var(--muted); font-size: clamp(16px, 2vw, 19px); line-height: 1.7; }
    .hero-actions { position: relative; display: flex; align-items: center; gap: 10px; margin-top: 30px; flex-wrap: wrap; }
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 42px; padding: 9px 15px; border: 1px solid var(--line-strong); border-radius: 10px; background: rgba(255,255,255,.055); color: var(--text); font-size: 13px; font-weight: 720; cursor: pointer; transition: transform .2s ease, background .2s ease, border-color .2s ease; }
    .btn:hover { transform: translateY(-1px); background: rgba(255,255,255,.09); border-color: rgba(255,255,255,.22); }
    .btn.primary { background: #f5f5f7; color: #09090b; border-color: #fff; box-shadow: 0 8px 28px rgba(255,255,255,.08); }
    .btn.primary:hover { background: #fff; }
    .status { display: inline-flex; align-items: center; gap: 8px; min-height: 42px; padding: 8px 13px; border: 1px solid var(--line); border-radius: 999px; color: var(--muted); background: rgba(255,255,255,.025); font-size: 12px; }
    .status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); box-shadow: 0 0 13px rgba(141,240,177,.65); }

    .section { padding: 50px 0 92px; }
    .section-head { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 24px; }
    .kicker { color: var(--subtle); font-size: 11px; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; margin-bottom: 7px; }
    .section-title { margin: 0; font-size: clamp(26px, 3vw, 34px); line-height: 1.12; letter-spacing: -.045em; }
    .section-desc { margin: 8px 0 0; color: var(--muted); font-size: 14px; max-width: 680px; }
    .endpoint-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; }
    .endpoint-card {
      position: relative; overflow: hidden; min-height: 170px; padding: 22px; border: 1px solid var(--line); border-radius: var(--radius);
      background: linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.018)); transition: .25s ease;
    }
    .endpoint-card::after { content: ""; position: absolute; width: 160px; height: 160px; right: -80px; top: -90px; border-radius: 50%; background: rgba(180,156,255,.08); filter: blur(15px); }
    .endpoint-card:hover { transform: translateY(-3px); border-color: var(--line-strong); background: linear-gradient(145deg,rgba(255,255,255,.065),rgba(255,255,255,.025)); }
    .method { display: inline-flex; padding: 4px 7px; border-radius: 6px; background: rgba(141,240,177,.09); color: var(--green); font: 800 10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: .03em; }
    .endpoint-path { margin: 16px 0 8px; font: 650 14px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: -.02em; }
    .endpoint-card p { margin: 0; color: var(--muted); font-size: 12px; }
    .endpoint-type { margin-top: 16px; color: var(--subtle); font: 11px ui-monospace, monospace; }

    .playground-wrap { position: relative; }
    .playground-wrap::before { content: ""; position: absolute; inset: 8% 20% -10%; background: radial-gradient(circle,rgba(115,93,255,.09),transparent 65%); filter: blur(40px); pointer-events: none; }
    .playground { position: relative; display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 16px; }
    .panel { min-width: 0; border: 1px solid var(--line); border-radius: var(--radius); background: var(--panel); box-shadow: var(--shadow); backdrop-filter: blur(12px); }
    .panel-top { min-height: 56px; padding: 12px 16px; border-bottom: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .panel-title { font-size: 12px; font-weight: 760; }
    .panel-meta { color: var(--subtle); font: 10px ui-monospace, monospace; }
    .panel-body { padding: 16px; }
    .field-label { display: block; margin: 0 0 7px; color: var(--muted); font-size: 11px; font-weight: 700; }
    select, textarea {
      width: 100%; border: 1px solid var(--line); outline: none; border-radius: 10px; background: #0b0b0f; color: var(--text); transition: border-color .2s ease, box-shadow .2s ease;
    }
    select { height: 40px; padding: 0 11px; font-size: 12px; }
    textarea { display: block; min-height: 365px; padding: 14px; resize: vertical; font: 11px/1.7 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    select:focus, textarea:focus { border-color: rgba(180,156,255,.48); box-shadow: 0 0 0 3px rgba(180,156,255,.08); }
    .field { margin-bottom: 13px; }
    .actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .actions .btn { min-height: 38px; }
    .result-box { min-height: 472px; display: flex; align-items: center; justify-content: center; padding: 20px; border: 1px dashed rgba(255,255,255,.12); border-radius: 12px; background: radial-gradient(circle at 50% 45%,rgba(180,156,255,.07),transparent 45%),#0b0b0f; overflow: hidden; }
    .result-box img { display: block; max-width: 100%; max-height: 600px; width: auto; height: auto; border-radius: 6px; box-shadow: 0 20px 60px rgba(0,0,0,.5); }
    .placeholder { max-width: 280px; text-align: center; color: var(--subtle); font-size: 12px; }
    .placeholder strong { display: block; margin-bottom: 5px; color: var(--muted); font-size: 13px; }
    .result-error { max-width: 100%; color: var(--red); white-space: pre-wrap; overflow-wrap: anywhere; font: 11px/1.6 ui-monospace, monospace; }
    .result-tools { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 10px; }
    .result-tools span { color: var(--subtle); font-size: 10px; }
    .mini-btn { border: 1px solid var(--line); border-radius: 8px; background: rgba(255,255,255,.035); color: var(--muted); padding: 6px 9px; font-size: 10px; cursor: pointer; }
    .mini-btn:hover { color: var(--text); background: rgba(255,255,255,.07); }

    .docs-layout { display: grid; grid-template-columns: 190px minmax(0,1fr); gap: 42px; align-items: start; }
    .docs-nav { position: sticky; top: 92px; padding: 7px 0; }
    .docs-nav-title { color: var(--subtle); font-size: 10px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; margin-bottom: 10px; }
    .docs-nav a { display: block; padding: 7px 10px; border-left: 1px solid var(--line); color: var(--muted); font-size: 12px; transition: .2s ease; }
    .docs-nav a:hover, .docs-nav a.active { color: var(--text); border-left-color: var(--purple); background: linear-gradient(90deg,rgba(180,156,255,.07),transparent); }
    .doc { min-width: 0; }
    .doc-block { padding: 0 0 68px; scroll-margin-top: 92px; }
    .doc-block:last-child { padding-bottom: 10px; }
    .doc h2 { margin: 0 0 9px; font-size: 24px; letter-spacing: -.035em; }
    .doc h3 { margin: 28px 0 10px; font-size: 15px; letter-spacing: -.015em; }
    .doc p, .doc li { color: var(--muted); font-size: 13px; }
    .doc ul { padding-left: 19px; }
    .table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 12px; scrollbar-width: none; }
    .table-wrap::-webkit-scrollbar, pre::-webkit-scrollbar { display: none; width: 0; height: 0; }
    table { width: 100%; border-collapse: collapse; min-width: 700px; font-size: 11px; }
    th, td { padding: 11px 12px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
    th { color: var(--text); background: rgba(255,255,255,.035); font-weight: 720; }
    td { color: var(--muted); }
    tr:last-child td { border-bottom: 0; }
    td code, p code, li code { padding: 2px 5px; border: 1px solid var(--line); border-radius: 5px; background: rgba(255,255,255,.035); color: #dddde5; font: 10px ui-monospace, monospace; }
    pre { position: relative; margin: 13px 0; padding: 16px; overflow: auto; border: 1px solid var(--line); border-radius: 12px; background: #0a0a0d; color: #dedee6; font: 11px/1.75 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; scrollbar-width: none; }
    .code-label { color: var(--subtle); font: 9px ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase; }
    .feature-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-top: 15px; }
    .feature { min-height: 118px; padding: 17px; border: 1px solid var(--line); border-radius: 13px; background: rgba(255,255,255,.025); transition: .2s ease; }
    .feature:hover { border-color: var(--line-strong); background: rgba(255,255,255,.04); }
    .feature h3 { margin: 0 0 6px; font-size: 13px; }
    .feature p { margin: 0; font-size: 11px; line-height: 1.55; }
    .callout { padding: 15px 16px; border: 1px solid rgba(180,156,255,.18); border-radius: 12px; background: rgba(180,156,255,.045); color: var(--muted); font-size: 12px; }
    .callout strong { color: var(--text); }

    footer { margin-top: 30px; border-top: 1px solid var(--line); }
    .footer-inner { min-height: 90px; display: flex; align-items: center; justify-content: space-between; gap: 20px; color: var(--subtle); font-size: 11px; }
    .footer-brand { color: var(--muted); font-weight: 700; }

    .toast { position: fixed; left: 50%; bottom: 22px; z-index: 100; transform: translate(-50%,18px); opacity: 0; pointer-events: none; padding: 9px 13px; border: 1px solid var(--line-strong); border-radius: 9px; background: rgba(18,18,23,.94); color: var(--text); box-shadow: var(--shadow); font-size: 11px; transition: .22s ease; backdrop-filter: blur(12px); }
    .toast.show { opacity: 1; transform: translate(-50%,0); }

    @media (max-width: 980px) {
      .shell { width: min(100% - 34px, 760px); }
      .endpoint-grid, .feature-grid { grid-template-columns: 1fr 1fr; }
      .playground { grid-template-columns: 1fr; }
      .result-box { min-height: 360px; }
      .docs-layout { grid-template-columns: 1fr; gap: 24px; }
      .docs-nav { position: static; display: flex; align-items: center; gap: 4px; overflow-x: auto; border-bottom: 1px solid var(--line); padding: 0 0 10px; scrollbar-width: none; }
      .docs-nav::-webkit-scrollbar { display: none; }
      .docs-nav-title { display: none; }
      .docs-nav a { white-space: nowrap; border: 0; border-radius: 8px; padding: 7px 9px; }
      .docs-nav a:hover, .docs-nav a.active { border: 0; background: rgba(180,156,255,.08); }
    }

    @media (max-width: 640px) {
      .shell { width: min(100% - 24px, 560px); }
      header { background: rgba(7,7,9,.9); }
      nav { height: 60px; }
      .navlinks { display: none; }
      .mobile-nav { display: inline-flex; gap: 4px; }
      .mobile-nav a { padding: 7px 9px; color: var(--muted); font-size: 11px; }
      .hero { padding: 72px 0 62px; }
      h1 { font-size: clamp(48px, 16vw, 72px); }
      .hero-copy { font-size: 15px; line-height: 1.65; }
      .hero-actions { align-items: stretch; flex-direction: column; }
      .hero-actions .btn, .hero-actions .status { width: 100%; }
      .section { padding: 36px 0 62px; }
      .section-head { display: block; }
      .endpoint-grid, .feature-grid { grid-template-columns: 1fr; }
      .endpoint-card { min-height: 150px; }
      .panel-body { padding: 12px; }
      textarea { min-height: 300px; }
      .result-box { min-height: 300px; padding: 12px; }
      .doc-block { padding-bottom: 52px; }
      .doc h2 { font-size: 22px; }
      .table-wrap { border-radius: 10px; }
      table { min-width: 650px; }
      pre { padding: 13px; font-size: 10px; }
      .footer-inner { min-height: 76px; align-items: flex-start; justify-content: center; flex-direction: column; gap: 3px; padding: 20px 0; }
    }
  </style>
</head>
<body>
  <div class="noise"></div>
  <header>
    <div class="shell">
      <nav>
        <a class="brand" href="#top"><span class="brand-mark">Q</span><span>Quote API</span></a>
        <div class="navlinks">
          <a href="#playground">Playground</a>
          <a href="#documentation">Docs</a>
          <a class="nav-cta" href="/health">Health</a>
        </div>
        <div class="mobile-nav">
          <a href="#playground">Try</a>
          <a href="#documentation">Docs</a>
        </div>
      </nav>
    </div>
  </header>

  <main id="top">
    <div class="shell">
      <section class="hero">
        <div class="eyebrow">Telegram quote image generator</div>
        <h1>Quote API, <span>reimagined.</span></h1>
        <p class="hero-copy">A fast, flexible API for turning Telegram-style messages into polished quote images. Avatars, replies, media, formatting, gradients, stories and multiple output formats — ready to integrate.</p>
        <div class="hero-actions">
          <a class="btn primary" href="#playground">Try the playground</a>
          <a class="btn" href="#quickstart">Read the docs</a>
          <div class="status"><span class="status-dot"></span> API online and ready</div>
        </div>
      </section>

      <section class="section" id="endpoints">
        <div class="section-head">
          <div><div class="kicker">API surface</div><h2 class="section-title">Three ways to generate.</h2><p class="section-desc">Use the JSON endpoint when you need metadata, or direct image endpoints when you just want the file.</p></div>
        </div>
        <div class="endpoint-grid">
          <a class="endpoint-card" href="#playground" data-endpoint-link="/quote/generate">
            <span class="method">POST</span><div class="endpoint-path">/quote/generate</div><p>Generate a quote image and receive the result as base64 inside a JSON response.</p><div class="endpoint-type">application/json</div>
          </a>
          <a class="endpoint-card" href="#playground" data-endpoint-link="/quote/generate.png">
            <span class="method">POST</span><div class="endpoint-path">/quote/generate.png</div><p>Generate a PNG and return the image directly as the HTTP response body.</p><div class="endpoint-type">image/png</div>
          </a>
          <a class="endpoint-card" href="#playground" data-endpoint-link="/quote/generate.webp">
            <span class="method">POST</span><div class="endpoint-path">/quote/generate.webp</div><p>Generate a WebP and return the image directly for smaller output files.</p><div class="endpoint-type">image/webp</div>
          </a>
        </div>
      </section>

      <section class="section playground-wrap" id="playground">
        <div class="section-head">
          <div><div class="kicker">Try it live</div><h2 class="section-title">Interactive playground.</h2><p class="section-desc">Change the request, hit generate, and see the actual image returned by this API.</p></div>
        </div>
        <div class="playground">
          <div class="panel">
            <div class="panel-top"><span class="panel-title">Request</span><span class="panel-meta">POST</span></div>
            <div class="panel-body">
              <div class="field"><label class="field-label" for="endpoint">Endpoint</label><select id="endpoint">
                <option value="/quote/generate">/quote/generate — JSON + base64</option>
                <option value="/quote/generate.png">/quote/generate.png — PNG</option>
                <option value="/quote/generate.webp">/quote/generate.webp — WebP</option>
              </select></div>
              <div class="field"><label class="field-label" for="payload">JSON body</label><textarea id="payload" spellcheck="false">{
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
}</textarea></div>
              <div class="actions"><button class="btn primary" id="generate" type="button">Generate image</button><button class="btn" id="reset" type="button">Reset</button></div>
            </div>
          </div>

          <div class="panel">
            <div class="panel-top"><span class="panel-title">Result</span><span class="panel-meta" id="result-meta">WAITING</span></div>
            <div class="panel-body">
              <div class="result-box" id="result"><div class="placeholder"><strong>No image yet</strong>Run the request to preview your generated quote here.</div></div>
              <div class="result-tools"><span id="result-info">Ready when you are.</span><button class="mini-btn" id="download" type="button" hidden>Download image</button></div>
            </div>
          </div>
        </div>
      </section>

      <section class="section" id="documentation">
        <div class="section-head"><div><div class="kicker">Reference</div><h2 class="section-title">Documentation.</h2><p class="section-desc">Everything you need to integrate the API into a bot, website or application.</p></div></div>
        <div class="docs-layout">
          <aside class="docs-nav">
            <div class="docs-nav-title">On this page</div>
            <a href="#quickstart" class="active">Quick start</a>
            <a href="#request">Request</a>
            <a href="#message">Message</a>
            <a href="#features">Features</a>
            <a href="#responses">Responses</a>
            <a href="#errors">Errors</a>
            <a href="#examples">Examples</a>
          </aside>

          <div class="doc">
            <div class="doc-block" id="quickstart">
              <h2>Quick start</h2>
              <p>The smallest useful request contains a <code>messages</code> array with a sender and message text.</p>
              <div class="code-label">cURL</div>
              <pre>curl -X POST https://quote-api-inky.vercel.app/quote/generate \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [{
      "from": {"id": 1, "name": "User"},
      "text": "Hello world!"
    }]
  }'</pre>
              <div class="callout"><strong>Tip:</strong> Use <code>/quote/generate.png</code> or <code>/quote/generate.webp</code> when your client wants the image bytes directly instead of base64.</div>
            </div>

            <div class="doc-block" id="request">
              <h2>Request parameters</h2>
              <p>All generation endpoints accept a JSON request body. Optional fields fall back to the renderer defaults.</p>
              <div class="table-wrap"><table><thead><tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr></thead><tbody>
                <tr><td><code>messages</code></td><td>array</td><td>Yes</td><td>Messages to render.</td></tr>
                <tr><td><code>type</code></td><td>string</td><td>No</td><td>Quote layout type. Use <code>stories</code> for a story-style layout.</td></tr>
                <tr><td><code>format</code></td><td>string</td><td>No</td><td>Output format: <code>png</code> or <code>webp</code>.</td></tr>
                <tr><td><code>ext</code></td><td>string</td><td>No</td><td>Output extension used by the API formatter.</td></tr>
                <tr><td><code>backgroundColor</code></td><td>string</td><td>No</td><td>HEX/CSS color, <code>random</code>, or gradient notation such as <code>#111/#222</code>.</td></tr>
                <tr><td><code>width</code></td><td>number</td><td>No</td><td>Layout width in pixels before scaling.</td></tr>
                <tr><td><code>height</code></td><td>number</td><td>No</td><td>Layout height in pixels before scaling.</td></tr>
                <tr><td><code>scale</code></td><td>number</td><td>No</td><td>Rendering scale. Supported range is 1–20.</td></tr>
                <tr><td><code>emojiBrand</code></td><td>string</td><td>No</td><td>Emoji renderer such as <code>apple</code>, <code>google</code>, or <code>twitter</code>.</td></tr>
                <tr><td><code>botToken</code></td><td>string</td><td>No</td><td>Telegram bot token when Telegram file IDs need to be resolved.</td></tr>
              </tbody></table></div>
            </div>

            <div class="doc-block" id="message">
              <h2>Message object</h2>
              <p>Each item in <code>messages</code> represents one Telegram-style message.</p>
              <div class="table-wrap"><table><thead><tr><th>Field</th><th>Type</th><th>Description</th></tr></thead><tbody>
                <tr><td><code>from</code></td><td>object</td><td>Sender data such as <code>id</code>, <code>name</code>, <code>first_name</code>, <code>last_name</code>, <code>username</code>, and an optional photo.</td></tr>
                <tr><td><code>text</code></td><td>string</td><td>Message text to render.</td></tr>
                <tr><td><code>entities</code></td><td>array</td><td>Telegram text entities such as bold, italic, code, links and custom emoji.</td></tr>
                <tr><td><code>avatar</code></td><td>boolean</td><td>Whether the sender avatar is displayed.</td></tr>
                <tr><td><code>replyMessage</code></td><td>object</td><td>Optional replied-to message with its text and sender information.</td></tr>
                <tr><td><code>media</code></td><td>object|array</td><td>Media from a URL or Telegram file ID. Multiple media items are supported.</td></tr>
                <tr><td><code>mediaType</code></td><td>string</td><td>Use <code>sticker</code> for sticker media.</td></tr>
                <tr><td><code>mediaCrop</code></td><td>boolean</td><td>Crop media to maintain the intended proportions.</td></tr>
                <tr><td><code>voice</code></td><td>object</td><td>Voice waveform data, for example <code>{ waveform: [...] }</code>.</td></tr>
              </tbody></table></div>
            </div>

            <div class="doc-block" id="features">
              <h2>Features</h2>
              <div class="feature-grid">
                <div class="feature"><h3>Multiple messages</h3><p>Render conversations with multiple senders in a single image.</p></div>
                <div class="feature"><h3>Text entities</h3><p>Support rich Telegram-style text formatting and links.</p></div>
                <div class="feature"><h3>Media</h3><p>Attach image or sticker media from URLs or Telegram file IDs.</p></div>
                <div class="feature"><h3>Replies</h3><p>Show replied-to message context above the current message.</p></div>
                <div class="feature"><h3>Voice</h3><p>Represent voice messages with waveform data.</p></div>
                <div class="feature"><h3>Stories</h3><p>Use <code>type: "stories"</code> for a 720×1280 story layout.</p></div>
                <div class="feature"><h3>Gradients</h3><p>Combine two background colors with <code>#111/#222</code> notation.</p></div>
                <div class="feature"><h3>PNG / WebP</h3><p>Choose the output format or use a direct image endpoint.</p></div>
                <div class="feature"><h3>Emoji brands</h3><p>Render emoji using supported brand sets such as Apple, Google and Twitter.</p></div>
              </div>
            </div>

            <div class="doc-block" id="responses">
              <h2>Responses</h2>
              <h3>JSON endpoint</h3>
              <div class="code-label">200 OK · application/json</div>
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
              <h3>Direct image endpoints</h3>
              <p><code>/quote/generate.png</code> responds with <code>image/png</code>. <code>/quote/generate.webp</code> responds with <code>image/webp</code>.</p>
            </div>

            <div class="doc-block" id="errors">
              <h2>Errors</h2>
              <div class="code-label">Example · 400 Bad Request</div>
              <pre>{"ok":false,"error":{"code":400,"message":"messages_empty"}}</pre>
              <p>Validation errors can include <code>query_empty</code>, <code>messages_empty</code>, and <code>empty_messages</code>. The API may return HTTP 429 when the rate limit is exceeded.</p>
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
const image = Buffer.from(data.result.image, 'base64')</pre>
              <h3>Python</h3>
              <pre>import base64
import requests

payload = {
    "messages": [{
        "from": {"id": 1, "name": "User"},
        "text": "Hello world!"
    }]
}

response = requests.post('/quote/generate', json=payload)
data = response.json()
image = base64.b64decode(data['result']['image'])</pre>
            </div>
          </div>
        </div>
      </section>
    </div>
  </main>

  <footer>
    <div class="shell footer-inner"><span class="footer-brand">Quote API — Reimagined</span><span>Self-hosted quote image generation API</span></div>
  </footer>

  <div class="toast" id="toast"></div>

  <script>
    const payload = document.getElementById('payload')
    const endpoint = document.getElementById('endpoint')
    const result = document.getElementById('result')
    const generate = document.getElementById('generate')
    const reset = document.getElementById('reset')
    const download = document.getElementById('download')
    const resultMeta = document.getElementById('result-meta')
    const resultInfo = document.getElementById('result-info')
    const toast = document.getElementById('toast')
    const defaultPayload = payload.value
    let resultUrl = null

    function showToast(message) {
      toast.textContent = message
      toast.classList.add('show')
      clearTimeout(showToast.timer)
      showToast.timer = setTimeout(() => toast.classList.remove('show'), 1800)
    }

    function resetResult() {
      if (resultUrl) URL.revokeObjectURL(resultUrl)
      resultUrl = null
      download.hidden = true
      resultMeta.textContent = 'WAITING'
      resultInfo.textContent = 'Ready when you are.'
      result.innerHTML = '<div class="placeholder"><strong>No image yet</strong>Run the request to preview your generated quote here.</div>'
    }

    reset.addEventListener('click', () => {
      payload.value = defaultPayload
      endpoint.value = '/quote/generate'
      resetResult()
    })

    document.querySelectorAll('[data-endpoint-link]').forEach(link => {
      link.addEventListener('click', () => {
        endpoint.value = link.dataset.endpointLink
      })
    })

    download.addEventListener('click', () => {
      if (!resultUrl) return
      const a = document.createElement('a')
      a.href = resultUrl
      a.download = endpoint.value.endsWith('.webp') ? 'quote.webp' : 'quote.png'
      document.body.appendChild(a)
      a.click()
      a.remove()
    })

    generate.addEventListener('click', async () => {
      let body
      try {
        body = JSON.parse(payload.value)
      } catch (error) {
        resultMeta.textContent = 'INVALID JSON'
        resultInfo.textContent = 'Fix the request body and try again.'
        result.innerHTML = '<div class="result-error">Invalid JSON. Please check the request body.</div>'
        return
      }

      generate.disabled = true
      generate.textContent = 'Generating…'
      resultMeta.textContent = 'PROCESSING'
      resultInfo.textContent = 'Rendering your quote…'
      download.hidden = true
      result.innerHTML = '<div class="placeholder"><strong>Generating image</strong>Please wait while the renderer builds your quote.</div>'

      try {
        const response = await fetch(endpoint.value, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
        const contentType = response.headers.get('content-type') || ''

        if (!response.ok) {
          const text = await response.text()
          throw new Error(text || ('HTTP ' + response.status))
        }

        if (resultUrl) URL.revokeObjectURL(resultUrl)

        if (contentType.includes('image/')) {
          const blob = await response.blob()
          resultUrl = URL.createObjectURL(blob)
          result.innerHTML = '<img alt="Generated quote" src="' + resultUrl + '">'
          download.hidden = false
          resultMeta.textContent = response.headers.get('quote-type') || 'IMAGE'
          resultInfo.textContent = (response.headers.get('quote-width') || '?') + ' × ' + (response.headers.get('quote-height') || '?')
        } else {
          const data = await response.json()
          const base64 = data.result && data.result.image
          if (!base64) throw new Error(JSON.stringify(data, null, 2))
          resultUrl = 'data:image/png;base64,' + base64
          result.innerHTML = '<img alt="Generated quote" src="' + resultUrl + '">'
          download.hidden = false
          resultMeta.textContent = data.result.type ? String(data.result.type).toUpperCase() : 'GENERATED'
          resultInfo.textContent = (data.result.width || '?') + ' × ' + (data.result.height || '?') + ' · ' + (data.result.ext || 'png')
        }
        showToast('Image generated successfully')
      } catch (error) {
        resultMeta.textContent = 'ERROR'
        resultInfo.textContent = 'The request could not be completed.'
        result.innerHTML = '<div class="result-error">' + String(error.message || error).replace(/</g, '&lt;') + '</div>'
      } finally {
        generate.disabled = false
        generate.textContent = 'Generate image'
      }
    })

    const docLinks = [...document.querySelectorAll('.docs-nav a')]
    const docBlocks = docLinks.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean)
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        docLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id))
      })
    }, { rootMargin: '-20% 0px -65% 0px', threshold: 0 })
    docBlocks.forEach(block => observer.observe(block))
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

route.use('/*path', routes.routeApi.routes())
app.use(route.routes())

const ready = loadFonts()

module.exports = { app, ready }
