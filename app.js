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

app.use(require('./helpers').helpersApi)

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
  <title>Quote API</title>
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: system-ui, sans-serif; background: #0b0b0f; color: #f5f5f5; }
    main { width: min(680px, calc(100% - 40px)); text-align: center; }
    h1 { margin: 0 0 12px; font-size: 32px; }
    p { margin: 8px 0; color: #a9a9b2; line-height: 1.6; }
    code { padding: 3px 7px; border-radius: 6px; background: #18181f; color: #fff; }
  </style>
</head>
<body>
  <main>
    <h1>Quote API</h1>
    <p>API is online and ready.</p>
    <p>Use <code>POST /quote/generate</code> to generate a quote image.</p>
    <p>Health: <code>GET /health</code></p>
  </main>
</body>
</html>`
})

route.get('/health', (ctx) => {
  ctx.status = 200
  ctx.body = { status: 'ok', timestamp: Date.now() }
})

route.use('/*', routes.routeApi.routes())
app.use(route.routes())

const ready = loadFonts()

module.exports = { app, ready }
