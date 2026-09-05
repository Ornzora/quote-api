const Router = require('@koa/router')
const api = new Router()

const method = require('../methods')

const apiHandle = async (ctx) => {
  const rawPath = ctx.params.path
  const requestPath = Array.isArray(rawPath) ? rawPath.join('/') : rawPath
  const methodWithExt = requestPath.match(/(.*)\.(png|webp)$/)
  if (methodWithExt) ctx.props.ext = methodWithExt[2]
  ctx.result = await method(methodWithExt ? methodWithExt[1] : requestPath, ctx.props)
}

api.post('/', apiHandle)

module.exports = api
