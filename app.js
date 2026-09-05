const fs = require('fs')
const path = require('path')
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
const ui = fs.readFileSync(path.join(__dirname, 'web', 'index.html'), 'utf8')
const fontsDir = path.join(__dirname, 'assets', 'fonts')

route.get('/', (ctx) => {
  ctx.status = 200
  ctx.type = 'text/html'
  ctx.body = ui
})

route.get('/fonts/:name', (ctx) => {
  const name = path.basename(ctx.params.name)
  const allowed = /^(nunito-latin-(400|600|700|800)-normal|pacifico-latin-400-normal)\.(woff2?|woff)$/
  if (!allowed.test(name)) {
    ctx.status = 404
    return
  }
  const file = path.join(fontsDir, name)
  if (!fs.existsSync(file)) {
    ctx.status = 404
    return
  }
  ctx.type = name.endsWith('.woff2') ? 'font/woff2' : 'font/woff'
  ctx.set('Cache-Control', 'public, max-age=31536000, immutable')
  ctx.body = fs.createReadStream(file)
})

route.get('/default-avatar.svg', (ctx) => {
  ctx.status = 200
  ctx.type = 'image/svg+xml'
  ctx.body = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1254 1254"><rect width="1254" height="1254" fill="#fff"/><path d="M256 610C250 470 285 350 405 290C490 248 575 250 629 251C770 246 914 290 974 401C1026 497 1040 620 1018 727C993 848 913 948 798 983C680 1019 548 1002 442 947C325 887 267 785 256 610Z" fill="#fff" stroke="#000" stroke-width="47" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="437" cy="407" rx="31" ry="43" fill="#000" transform="rotate(9 437 407)"/><ellipse cx="850" cy="462" rx="31" ry="43" fill="#000" transform="rotate(9 850 462)"/><path d="M588 866C632 866 680 869 724 876" fill="none" stroke="#000" stroke-width="40" stroke-linecap="round"/></svg>'
})

app.use(async (ctx, next) => {
  if (ctx.path === '/' || ctx.path === '/health' || ctx.path === '/default-avatar.svg' || ctx.path.startsWith('/fonts/')) return next()
  return require('./helpers').helpersApi(ctx, next)
})

route.get('/health', (ctx) => {
  ctx.status = 200
  ctx.body = { status: 'ok', timestamp: Date.now() }
})

route.use('/*path', routes.routeApi.routes())
app.use(route.routes())

const ready = loadFonts()
module.exports = { app, ready }
