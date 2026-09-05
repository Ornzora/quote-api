const path = require('path')
const { QuoteGenerate } = require('../utils')
const { createCanvas, loadImage } = require('canvas')
const sharp = require('sharp')
const { parseBackgroundColor, colorLuminance, lightOrDark, hexToHsl, hslToHex } = require('../utils/quote-generate/color')
const { brands: emojiBrands } = require('../utils/emoji-image')

const ALLOWED_EMOJI_BRANDS = new Set(Object.keys(emojiBrands))
const MAX_DIMENSION = 2048
const MAX_SCALE = 4

let cachedPatternImage = null
async function getPatternImage () {
  if (!cachedPatternImage) {
    cachedPatternImage = await loadImage(path.join(__dirname, '..', 'assets', 'pattern_02.png'))
  }
  return cachedPatternImage
}

const imageAlpha = (image, alpha) => {
  const canvas = createCanvas(image.width, image.height)
  const canvasCtx = canvas.getContext('2d')
  canvasCtx.globalAlpha = alpha
  canvasCtx.drawImage(image, 0, 0)
  return canvas
}

function normalizeMessage (message) {
  if (!message.from) {
    message.from = { id: 0 }
  }
  if (!message.from.photo) {
    message.from.photo = {}
  }
  if (message.from.name !== false && !message.from.name && (message.from.first_name || message.from.last_name)) {
    message.from.name = [message.from.first_name, message.from.last_name]
      .filter(Boolean)
      .join(' ')
  }
  if (message.replyMessage) {
    if (!message.replyMessage.chatId) {
      message.replyMessage.chatId = message.from.id || 0
    }
    if (!message.replyMessage.entities) {
      message.replyMessage.entities = []
    }
    if (!message.replyMessage.from) {
      message.replyMessage.from = {
        name: message.replyMessage.name,
        photo: {}
      }
    } else if (!message.replyMessage.from.photo) {
      message.replyMessage.from.photo = {}
    }
  }
}

async function drawPatternBackground (canvas, centerColor, edgeColor, patternImage, patternAlpha) {
  const ctx = canvas.getContext('2d')

  const gradient = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, 0,
    canvas.width / 2, canvas.height / 2, canvas.width / 2
  )
  gradient.addColorStop(0, centerColor)
  gradient.addColorStop(1, edgeColor)

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const pattern = ctx.createPattern(imageAlpha(patternImage, patternAlpha), 'repeat')
  ctx.fillStyle = pattern
  ctx.fillRect(0, 0, canvas.width, canvas.height)
}

function wallpaperColors (colorOne) {
  if (lightOrDark(colorOne) === 'dark') {
    return {
      center: colorLuminance(colorOne, -0.35),
      edge: colorLuminance(colorOne, -0.6),
      patternAlpha: 0.22
    }
  }
  let [h, s] = hexToHsl(colorOne)
  if (s < 0.08) {
    h = 207
    s = 0.45
  } else {
    s = Math.min(1, Math.max(s * 1.8, 0.35))
  }
  return {
    center: hslToHex(h, s, 0.8),
    edge: hslToHex(h, s, 0.62),
    patternAlpha: 0.18
  }
}

module.exports = async (parm) => {
  if (!parm) return { error: 'query_empty' }
  if (!Array.isArray(parm.messages) || parm.messages.length < 1) return { error: 'messages_empty' }

  const botToken = parm.botToken || process.env.BOT_TOKEN
  const quoteGenerate = new QuoteGenerate(botToken)

  const scale = parm.scale != null && parm.scale !== '' ? Number(parm.scale) : 2
  const width = parm.width != null && parm.width !== '' ? Number(parm.width) : 512
  const height = parm.height != null && parm.height !== '' ? Number(parm.height) : 512
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height > MAX_DIMENSION || height < 1 || width > MAX_DIMENSION) {
    return { error: `width and height must be finite numbers between 1 and ${MAX_DIMENSION}` }
  }
  if (!Number.isFinite(scale) || scale < 1 || scale > MAX_SCALE) {
    return { error: `scale must be a finite number between 1 and ${MAX_SCALE}` }
  }

  const rawBrand = parm.emojiBrand || 'apple'
  const emojiBrand = ALLOWED_EMOJI_BRANDS.has(rawBrand) ? rawBrand : 'apple'

  const background = parseBackgroundColor(parm.backgroundColor)

  const validMessages = parm.messages.filter(Boolean)
  for (const message of validMessages) {
    normalizeMessage(message)
  }

  for (let i = 0; i < validMessages.length; i++) {
    const prevSame = i > 0 && validMessages[i - 1].chatId === validMessages[i].chatId
    const nextSame = i < validMessages.length - 1 && validMessages[i + 1].chatId === validMessages[i].chatId
    validMessages[i].groupPos = prevSame && nextSame ? 'middle' : prevSame ? 'last' : nextSame ? 'first' : 'single'
    if (nextSame) validMessages[i].avatar = false
  }

  const CONCURRENCY = 3
  const quoteImages = new Array(validMessages.length).fill(null)
  let running = 0
  let nextIndex = 0

  await new Promise((resolve) => {
    function runNext () {
      while (running < CONCURRENCY && nextIndex < validMessages.length) {
        const index = nextIndex++
        running++

        quoteGenerate.generate(
          background.colorOne,
          background.colorTwo,
          validMessages[index],
          width,
          height,
          scale,
          emojiBrand
        ).then((canvas) => {
          if (canvas) quoteImages[index] = canvas
          else console.warn('Failed to generate quote for message, skipping')
        }).catch((error) => {
          console.error('Error generating quote for message:', error.message)
        }).finally(() => {
          running--
          if (nextIndex >= validMessages.length && running === 0) resolve()
          else runNext()
        })
      }
      if (validMessages.length === 0) resolve()
    }
    runNext()
  })

  const pairs = validMessages
    .map((message, i) => ({ message, image: quoteImages[i] }))
    .filter((p) => p.image)
  const filteredImages = pairs.map((p) => p.image)

  if (filteredImages.length === 0) {
    return { error: 'empty_messages' }
  }

  let canvasQuote

  if (filteredImages.length > 1) {
    let width = 0
    let height = 0

    for (let index = 0; index < filteredImages.length; index++) {
      if (filteredImages[index].width > width) width = filteredImages[index].width
      height += filteredImages[index].height
    }

    const margins = []
    let totalMargin = 0
    for (let index = 0; index < pairs.length - 1; index++) {
      const grouped = pairs[index].message.chatId === pairs[index + 1].message.chatId
      const m = (grouped ? 2 : 6) * scale
      margins.push(m)
      totalMargin += m
    }

    const canvas = createCanvas(width, height + totalMargin)
    const canvasCtx = canvas.getContext('2d')

    let imageY = 0
    for (let index = 0; index < filteredImages.length; index++) {
      canvasCtx.drawImage(filteredImages[index], 0, imageY)
      imageY += filteredImages[index].height + (margins[index] || 0)
    }
    canvasQuote = canvas
  } else {
    canvasQuote = filteredImages[0]
  }

  let quoteImage

  let { type, format, ext } = parm

  if (!type && ext) type = 'png'
  if (type !== 'image' && type !== 'stories' && canvasQuote.height > 1024 * 2) type = 'png'

  if (type === 'quote') {
    const downPadding = 75
    const maxWidth = 512
    const maxHeight = 512

    const imageQuoteSharp = sharp(canvasQuote.toBuffer())

    if (canvasQuote.height > canvasQuote.width) imageQuoteSharp.resize({ height: maxHeight })
    else imageQuoteSharp.resize({ width: maxWidth })

    const canvasImage = await loadImage(await imageQuoteSharp.toBuffer())

    const canvasPadding = createCanvas(canvasImage.width, canvasImage.height + downPadding)
    const canvasPaddingCtx = canvasPadding.getContext('2d')
    canvasPaddingCtx.drawImage(canvasImage, 0, 0)

    const imageSharp = sharp(canvasPadding.toBuffer())

    if (canvasPadding.height >= canvasPadding.width) imageSharp.resize({ height: maxHeight })
    else imageSharp.resize({ width: maxWidth })

    if (format === 'png') quoteImage = await imageSharp.png().toBuffer()
    else quoteImage = await imageSharp.webp({ lossless: true, force: true }).toBuffer()
  } else if (type === 'image') {
    const heightPadding = 75 * scale
    const widthPadding = 95 * scale

    const canvasPic = createCanvas(canvasQuote.width + widthPadding, canvasQuote.height + heightPadding)
    const canvasPicCtx = canvasPic.getContext('2d')

    const patternImage = await getPatternImage()
    const wp = wallpaperColors(background.colorOne)
    await drawPatternBackground(canvasPic, wp.center, wp.edge, patternImage, wp.patternAlpha)

    canvasPicCtx.shadowOffsetX = 8
    canvasPicCtx.shadowOffsetY = 8
    canvasPicCtx.shadowBlur = 13
    canvasPicCtx.shadowColor = 'rgba(0, 0, 0, 0.5)'

    canvasPicCtx.drawImage(canvasQuote, widthPadding / 2, heightPadding / 2)

    canvasPicCtx.shadowOffsetX = 0
    canvasPicCtx.shadowOffsetY = 0
    canvasPicCtx.shadowBlur = 0
    canvasPicCtx.shadowColor = 'rgba(0, 0, 0, 0)'

    canvasPicCtx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    canvasPicCtx.font = `${8 * scale}px sans-serif`
    canvasPicCtx.textAlign = 'right'
    canvasPicCtx.fillText('@QuotLyBot', canvasPic.width - 25, canvasPic.height - 25)

    quoteImage = await sharp(canvasPic.toBuffer()).png({ lossless: true, force: true }).toBuffer()
  } else if (type === 'stories') {
    const canvasPic = createCanvas(720, 1280)
    const canvasPicCtx = canvasPic.getContext('2d')

    const patternImage = await getPatternImage()
    const storyWp = wallpaperColors(background.colorOne)
    await drawPatternBackground(canvasPic, storyWp.center, storyWp.edge, patternImage, storyWp.patternAlpha)

    canvasPicCtx.shadowOffsetX = 8
    canvasPicCtx.shadowOffsetY = 8
    canvasPicCtx.shadowBlur = 13
    canvasPicCtx.shadowColor = 'rgba(0, 0, 0, 0.5)'

    const minPadding = 110
    const maxW = canvasPic.width - minPadding * 2
    const maxH = canvasPic.height - minPadding * 2

    let drawSource = canvasQuote
    if (canvasQuote.width > maxW || canvasQuote.height > maxH) {
      const resizedBuffer = await sharp(canvasQuote.toBuffer()).resize({
        width: maxW,
        height: maxH,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }).toBuffer()
      drawSource = await loadImage(resizedBuffer)
    }

    const imageX = (canvasPic.width - drawSource.width) / 2
    const imageY = (canvasPic.height - drawSource.height) / 2

    canvasPicCtx.drawImage(drawSource, imageX, imageY)

    canvasPicCtx.shadowOffsetX = 0
    canvasPicCtx.shadowOffsetY = 0
    canvasPicCtx.shadowBlur = 0

    canvasPicCtx.fillStyle = 'rgba(0, 0, 0, 0.4)'
    canvasPicCtx.font = `${16 * scale}px sans-serif`
    canvasPicCtx.textAlign = 'center'
    canvasPicCtx.translate(70, canvasPic.height / 2)
    canvasPicCtx.rotate(-Math.PI / 2)
    canvasPicCtx.fillText('@QuotLyBot', 0, 0)

    quoteImage = await sharp(canvasPic.toBuffer()).png({ lossless: true, force: true }).toBuffer()
  } else {
    quoteImage = canvasQuote.toBuffer()
  }

  // Explicit response extensions control the actual returned byte format.
  // This keeps /quote/generate.webp from returning PNG bytes with a WebP content type.
  if (ext === 'webp') {
    quoteImage = await sharp(quoteImage).webp({ lossless: true, force: true }).toBuffer()
  } else if (ext === 'png') {
    quoteImage = await sharp(quoteImage).png({ lossless: true, force: true }).toBuffer()
  }

  let outputWidth, outputHeight
  if (type === 'quote' || type === 'image' || type === 'stories') {
    const imageMetadata = await sharp(quoteImage).metadata()
    outputWidth = imageMetadata.width
    outputHeight = imageMetadata.height
  } else {
    outputWidth = canvasQuote.width
    outputHeight = canvasQuote.height
  }

  let image
  if (ext) image = quoteImage
  else image = quoteImage.toString('base64')

  return { image, type, width: outputWidth, height: outputHeight, ext }
}
