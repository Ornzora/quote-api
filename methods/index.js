const crypto = require('crypto')
const LRU = require('lru-cache')
const sizeof = require('object-sizeof')

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

module.exports = async (method, parm) => {
  if (methods[method]) {
    if (method === 'generate') {
      const width = parm && parm.width != null ? Number(parm.width) : 512
      const height = parm && parm.height != null ? Number(parm.height) : 512
      const scale = parm && parm.scale != null ? Number(parm.scale) : 2

      if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1 || width > MAX_DIMENSION || height > MAX_DIMENSION) {
        return { error: `width and height must be finite numbers between 1 and ${MAX_DIMENSION}` }
      }
      if (!Number.isFinite(scale) || scale < 1 || scale > MAX_SCALE) {
        return { error: `scale must be a finite number between 1 and ${MAX_SCALE}` }
      }

      if (width * scale > MAX_DIMENSION * MAX_SCALE || height * scale > MAX_DIMENSION * MAX_SCALE) {
        return { error: `scaled dimensions must not exceed ${MAX_DIMENSION * MAX_SCALE}px` }
      }
    }

    let methodResult = {}

    const cacheString = crypto.createHash('md5').update(JSON.stringify({ method, parm })).digest('hex')
    const methodResultCache = cache.get(cacheString)

    if (!methodResultCache) {
      methodResult = await methods[method](parm)

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
