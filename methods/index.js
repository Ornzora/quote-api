const crypto = require('crypto')
const LRU = require('lru-cache')
const sizeof = require('object-sizeof')
const sharp = require('sharp')

const generate = require('./generate')

const methods = {
  generate
}

// Keep the in-process cache bounded for serverless runtimes. The previous
// 1 GB ceiling could retain a large number of generated base64 images.
const cache = new LRU({
  max: 64 * 1024 * 1024,
  length: (n) => sizeof(n),
  maxAge: 1000 * 60 * 45
})

const MAX_DIMENSION = 2048
const MAX_SCALE = 4
const COLOR_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

function normalizeQuoteColor (value, fallback) {
  if (value == null || value === '') return fallback
  const color = String(value).trim()
  return COLOR_RE.test(color) ? color.toUpperCase() : null
}

module.exports = async (method, parm) => {
  if (methods[method]) {
    let requestedFormat = null

    if (method === 'generate') {
      const width = parm && parm.width != null ? Number(parm.width) : 512
      const height = parm && parm.height != null ? Number(parm.height) : 512
      const scale = parm && parm.scale != null ? Number(parm.scale) : 2
      const format = parm && parm.format != null ? String(parm.format).toLowerCase() : 'png'
      requestedFormat = format

      if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1 || width > MAX_DIMENSION || height > MAX_DIMENSION) {
        return { error: `width and height must be finite numbers between 1 and ${MAX_DIMENSION}` }
      }
      if (!Number.isFinite(scale) || scale < 1 || scale > MAX_SCALE) {
        return { error: `scale must be a finite number between 1 and ${MAX_SCALE}` }
      }
      if (format !== 'png' && format !== 'webp') {
        return { error: 'format must be png or webp' }
      }

      const bubbleColor = normalizeQuoteColor(parm && parm.bubbleColor, '#FFFFFF')
      const nameColor = normalizeQuoteColor(parm && parm.nameColor, '#000000')
      const textColor = normalizeQuoteColor(parm && parm.textColor, '#000000')
      if (!bubbleColor || !nameColor || !textColor) {
        return { error: 'bubbleColor, nameColor, and textColor must be valid hex colors (#RGB or #RRGGBB)' }
      }

      if (width * scale > MAX_DIMENSION * MAX_SCALE || height * scale > MAX_DIMENSION * MAX_SCALE) {
        return { error: `scaled dimensions must not exceed ${MAX_DIMENSION * MAX_SCALE}px` }
      }

      parm = {
        ...parm,
        format,
        messages: parm.messages.map((message) => ({
          ...message,
          quoteColors: { bubbleColor, nameColor, textColor }
        }))
      }
    }

    let methodResult = {}

    const cacheString = crypto.createHash('md5').update(JSON.stringify({ method, parm })).digest('hex')
    const methodResultCache = cache.get(cacheString)

    if (!methodResultCache) {
      methodResult = await methods[method](parm)

      // `/quote/generate` is a JSON/base64 endpoint. Respect its `format`
      // field too, instead of returning PNG bytes while the client labels the
      // base64 payload as WebP.
      if (!methodResult.error && method === 'generate' && !methodResult.ext && requestedFormat === 'webp') {
        const input = Buffer.from(methodResult.image, 'base64')
        const output = await sharp(input).webp({ lossless: true, force: true }).toBuffer()
        methodResult.image = output.toString('base64')
      }

      if (!methodResult.error) cache.set(cacheString, methodResult)
    } else {
      methodResult = methodResultCache
    }

    return methodResult
  } else {
    return {
      error: 'method not found'
    }
  }
}
