const sharp = require('sharp')

function safeErrorMessage (message) {
  let text = String(message || 'Internal server error')
  const secrets = [process.env.BOT_TOKEN].filter(Boolean)
  for (const secret of secrets) text = text.split(secret).join('[REDACTED]')
  return text
}

module.exports = async (ctx, next) => {
  ctx.props = Object.assign({}, ctx.query || {}, ctx.request.body || {})

  try {
    await next()

    if (!ctx.body) {
      ctx.assert(ctx.result, 404, 'Not Found')

      if (ctx.result.error) {
        ctx.status = 400
        ctx.body = {
          ok: false,
          error: {
            code: 400,
            message: ctx.result.error
          }
        }
      } else {
        if (ctx.result.ext) {
          if (ctx.result.ext === 'webp') {
            ctx.response.set('content-type', 'image/webp')
            ctx.result.image = await sharp(ctx.result.image).webp({ lossless: true, force: true }).toBuffer()
          }
          if (ctx.result.ext === 'png') ctx.response.set('content-type', 'image/png')
          ctx.response.set('quote-type', ctx.result.type)
          ctx.response.set('quote-width', ctx.result.width)
          ctx.response.set('quote-height', ctx.result.height)
          ctx.body = ctx.result.image
        } else {
          ctx.body = {
            ok: true,
            result: ctx.result
          }
        }
      }
    }
  } catch (error) {
    const status = error.statusCode || error.status || 500
    const safeMessage = safeErrorMessage(error.message)
    console.error('API error:', safeMessage)
    ctx.status = status
    ctx.body = {
      ok: false,
      error: {
        code: ctx.status,
        message: ctx.status >= 500 ? 'Internal server error' : safeMessage,
        description: ctx.status >= 500 ? undefined : error.description
      }
    }
  }
}

module.exports.safeErrorMessage = safeErrorMessage
