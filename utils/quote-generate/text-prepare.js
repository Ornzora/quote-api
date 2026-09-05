// utils/quote-generate/text-prepare.js
// Prepare phase: tokenize text, load emoji, measure segments.
// Called once per text block. Returns PreparedText for layout/render phases.
//
// NOTE: text.split('') and entity offsets both use UTF-16 code units,
// consistent with Telegram API and JS string indexing. Do not refactor
// to Array.from(text) (codepoint split) without updating all offset logic.

const { createCanvas, loadImage } = require('canvas')
const sharp = require('sharp')
const loadImageFromUrl = require('../image-load-url')
const emojiDb = require('../emoji-db')
const { loadBrand } = require('../emoji-image')
const {
  BREAK_REGEX, SPACE_REGEX, CJK_REGEX,
  ENTITY_TYPES_MONOSPACE, ENTITY_TYPES_MENTION,
  EMOJI_SCALE, LEFT_STICKY_PUNCTUATION, KINSOKU_START, KINSOKU_END
} = require('./constants')

// Shared segmenters (singletons, like pretext)
const wordSegmenter = new Intl.Segmenter('en', { granularity: 'word' })
const graphemeSegmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })

// Shared measurement canvas (singleton, like pretext)
let measureCanvas = null
let measureCtx = null

function getMeasureCtx () {
  if (!measureCtx) {
    measureCanvas = createCanvas(1, 1)
    measureCtx = measureCanvas.getContext('2d')
  }
  return measureCtx
}

// Module-level emoji image cache — persists across calls
const emojiImageCache = new Map()

// Keep font metrics deterministic while using fonts that are available in
// Vercel/Linux canvas builds. The old NotoSans family was referenced by the
// renderer but was not bundled in assets/fonts, which caused missing-glyph
// boxes on serverless deployments.
const BASE_FONT = 'sans-serif'
const MONO_FONT = 'monospace'

// Vertical metrics of the base font at a given size — a constant of the
// font, so glyph shapes never affect line geometry (no "breathing" bubbles).
const PROBE_TALL = 'ẤÅЇĎ'
const PROBE_DEEP = 'jqyḑộ'
const fontMetricsCache = new Map()

function fontMetrics (fontSize) {
  let m = fontMetricsCache.get(fontSize)
  if (m) return m
  const ctx = getMeasureCtx()
  ctx.font = `${fontSize}px ${BASE_FONT}`
  const em = ctx.measureText('Mg')
  const tall = ctx.measureText(PROBE_TALL)
  const deep = ctx.measureText(PROBE_DEEP)
  const emAscent = Number.isFinite(em.emHeightAscent) ? em.emHeightAscent : fontSize * 1.05
  const emDescent = Number.isFinite(em.emHeightDescent) ? em.emHeightDescent : fontSize * 0.3
  m = {
    ascent: Math.ceil(Math.max(emAscent, tall.actualBoundingBoxAscent || 0, fontSize * 0.85)),
    descent: Math.ceil(Math.max(emDescent, deep.actualBoundingBoxDescent || 0, fontSize * 0.3))
  }
  fontMetricsCache.set(fontSize, m)
  return m
}

// Resolve the font string for a set of styles. Use generic CSS families so
// node-canvas can resolve a real system font even when custom assets are not
// present in a serverless deployment.
function resolveFont (styles, fontSize) {
  let fontType = ''
  let fontName = BASE_FONT

  if (styles.includes('bold')) fontType += 'bold '
  if (styles.includes('italic')) fontType += 'italic '
  if (styles.includes('monospace')) fontName = MONO_FONT

  return `${fontType}${fontSize}px ${fontName}`
}

// Parse entities into per-character style/emoji data
function buildStyledChars (text, entities) {
  const chars = text.split('')
  const styledChars = chars.map(char => ({ char, styles: [] }))

  // Apply string-type entities (e.g. 'bold' passed as string)
  if (entities && typeof entities === 'string') {
    for (const sc of styledChars) sc.styles.push(entities)
  }

  // Apply entity array
  if (Array.isArray(entities)) {
    for (const entity of entities) {
      const style = ENTITY_TYPES_MONOSPACE.includes(entity.type)
        ? 'monospace'
        : ENTITY_TYPES_MENTION.includes(entity.type)
          ? 'mention'
          : entity.type

      if (entity.type === 'custom_emoji') {
        styledChars[entity.offset].customEmojiId = entity.custom_emoji_id
      }

      for (let i = entity.offset; i < entity.offset + entity.length; i++) {
        if (styledChars[i]) styledChars[i].styles.push(style)
      }
    }
  }

  return styledChars
}

// Detect and map emoji positions onto styled chars
function mapEmojis (text, styledChars) {
  const emojis = emojiDb.searchFromText({ input: text, fixCodePoints: true })
  for (let eIdx = 0; eIdx < emojis.length; eIdx++) {
    const emoji = emojis[eIdx]
    for (let i = emoji.offset; i < emoji.offset + emoji.length; i++) {
      if (styledChars[i]) {
        styledChars[i].emoji = { index: eIdx, code: emoji.found }
      }
    }
  }
  return emojis
}

// Load emoji images (with module-level cache + in-flight dedup)
const emojiLoadingPromises = new Map()

async function loadEmojiImages (emojis, emojiBrand) {
  const emojiImageJson = loadBrand(emojiBrand || 'apple')
  let fallbackBrand = 'apple'
  if (emojiBrand === 'blob') fallbackBrand = 'google'
  const fallbackJson = loadBrand(fallbackBrand)

  const localMap = new Map()
  const promises = []

  for (const emoji of emojis) {
    const cacheKey = `${emojiBrand}:${emoji.found}`

    if (emojiImageCache.has(cacheKey)) {
      localMap.set(emoji.found, emojiImageCache.get(cacheKey))
    } else if (emojiLoadingPromises.has(cacheKey)) {
      promises.push(emojiLoadingPromises.get(cacheKey).then(img => {
        if (img) localMap.set(emoji.found, img)
      }))
    } else if (!localMap.has(emoji.found)) {
      const p = (async () => {
        const base = emojiImageJson[emoji.found]
        let image = null

        if (base) {
          try {
            image = await loadImage(Buffer.from(base, 'base64'))
          } catch (e) {
            try { image = await loadImage(Buffer.from(fallbackJson[emoji.found], 'base64')) } catch (e2) { /* skip */ }
          }
        } else {
          try { image = await loadImage(Buffer.from(fallbackJson[emoji.found], 'base64')) } catch (e) { /* skip */ }
        }

        if (image) {
          emojiImageCache.set(cacheKey, image)
          localMap.set(emoji.found, image)
        }
        return image
      })()
      emojiLoadingPromises.set(cacheKey, p)
      promises.push(p.finally(() => emojiLoadingPromises.delete(cacheKey)))
    }
  }

  await Promise.all(promises)
  return localMap
}

// Load custom emoji stickers via Telegram API
async function loadCustomEmojis (customEmojiIds, telegram) {
  const result = {}
  if (customEmojiIds.length === 0 || !telegram) return result

  const stickers = await telegram.callApi('getCustomEmojiStickers', {
    custom_emoji_ids: customEmojiIds
  }).catch(() => null)

  if (!stickers) return result

  const promises = stickers.map(async sticker => {
    if (!sticker.thumb || !sticker.thumb.file_id) return
    const fileLink = await telegram.getFileLink(sticker.thumb.file_id).catch(() => null)
    if (!fileLink) return
    const data = await loadImageFromUrl(fileLink).catch(() => null)
    if (!data) return
    const png = await sharp(data).png({ lossless: true, force: true }).toBuffer()
    result[sticker.custom_emoji_id] = await loadImage(png).catch(() => null)
  })

  await Promise.all(promises).catch(() => {})
  return result
}

// Tokenize styled chars into raw segments using Intl.Segmenter
function tokenize (text, styledChars, fontSize, emojiMap, customEmojiMap) {
  const segments = []
  const emojiSize = fontSize * EMOJI_SCALE

  // Use Intl.Segmenter for word boundaries
  const wordSegs = [...wordSegmenter.segment(text)]

  for (const wordSeg of wordSegs) {
    const start = wordSeg.index
    const end = start + wordSeg.segment.length

    // Further split each word segment by: style boundaries, emoji boundaries, explicit breaks
    let subStart = start
    for (let i = start; i < end; i++) {
      const cur = styledChars[i]
      const prev = i > subStart ? styledChars[i - 1] : null

      // Break chars always split unconditionally (even at segment start)
      const isBreak = cur.char.match(BREAK_REGEX)

      const needsSplit = isBreak || (prev && (
        // Emoji boundary
        (cur.emoji && !prev.emoji) ||
        (!cur.emoji && prev.emoji) ||
        (cur.emoji && prev.emoji && cur.emoji.index !== prev.emoji.index) ||
        // Style change
        (cur.styles.toString() !== prev.styles.toString())
      ))

      if (needsSplit) {
        if (i > subStart) {
          pushSegment(segments, styledChars, subStart, i, fontSize, emojiSize, emojiMap, customEmojiMap)
        }
        subStart = i
      }
    }

    if (subStart < end) {
      pushSegment(segments, styledChars, subStart, end, fontSize, emojiSize, emojiMap, customEmojiMap)
    }
  }

  return { segments, emojiSize }
}

function pushSegment (segments, styledChars, start, end, fontSize, emojiSize, emojiMap, customEmojiMap) {
  const chars = styledChars.slice(start, end)
  const text = chars.map(c => c.char).join('')
  const first = chars[0]
  const styles = first ? [...first.styles] : []
  const emoji = first && first.emoji
  const customEmojiId = first && first.customEmojiId

  if (emoji && emojiMap) {
    const image = emojiMap.get(emoji.code)
    if (image) {
      segments.push({ kind: 'emoji', text, styles, fontSize, emojiSize, emojiImage: image, start, end })
      return
    }
  }

  segments.push({ kind: 'text', text, styles, fontSize, start, end, customEmojiId, emoji })
}

async function prepareText (text, entities, fontSize, emojiBrand, telegram) {
  const styledChars = buildStyledChars(text, entities)
  const emojis = mapEmojis(text, styledChars)
  const customEmojiIds = []

  for (const c of styledChars) {
    if (c.customEmojiId && !customEmojiIds.includes(c.customEmojiId)) customEmojiIds.push(c.customEmojiId)
  }

  const [emojiMap, customEmojiMap] = await Promise.all([
    loadEmojiImages(emojis, emojiBrand),
    loadCustomEmojis(customEmojiIds, telegram)
  ])

  const { segments, emojiSize } = tokenize(text, styledChars, fontSize, emojiMap, customEmojiMap)
  const computeGraphemeWidths = (seg) => {
    if (!seg || seg.kind !== 'text') return null
    const ctx = getMeasureCtx()
    ctx.font = seg.font || `${fontSize}px ${BASE_FONT}`
    const texts = [...graphemeSegmenter.segment(seg.text)].map(x => x.segment)
    const widths = texts.map(t => ctx.measureText(t).width)
    return { texts, widths }
  }

  // Assign resolved fonts after tokenization so measurement and rendering use
  // exactly the same portable family.
  for (const seg of segments) {
    seg.font = resolveFont(seg.styles, fontSize)
  }

  return { segments, fontSize, emojiSize, computeGraphemeWidths }
}

module.exports = {
  prepareText,
  resolveFont,
  fontMetrics,
  BASE_FONT,
  MONO_FONT,
  getMeasureCtx,
  SPACE_REGEX,
  CJK_REGEX,
  LEFT_STICKY_PUNCTUATION,
  KINSOKU_START,
  KINSOKU_END
}
