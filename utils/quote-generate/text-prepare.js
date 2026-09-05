// utils/quote-generate/text-prepare.js
// Prepare phase: tokenize text, load emoji, measure segments.
// Keeps the rendering pipeline compatible with the upstream quote renderer.

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

const wordSegmenter = new Intl.Segmenter('en', { granularity: 'word' })
const graphemeSegmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })

let measureCanvas = null
let measureCtx = null

function getMeasureCtx () {
  if (!measureCtx) {
    measureCanvas = createCanvas(1, 1)
    measureCtx = measureCanvas.getContext('2d')
  }
  return measureCtx
}

const emojiImageCache = new Map()
const emojiLoadingPromises = new Map()

const BASE_FONT = 'NotoSans'
const MONO_FONT = 'NotoSansMono'

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

function resolveFont (styles, fontSize) {
  let fontType = ''
  let fontName = BASE_FONT
  if (styles.includes('bold')) fontType += 'bold '
  if (styles.includes('italic')) fontType += 'italic '
  if (styles.includes('monospace')) fontName = MONO_FONT
  return `${fontType}${fontSize}px ${fontName}`
}

function buildStyledChars (text, entities) {
  const chars = text.split('')
  const styledChars = chars.map(char => ({ char, styles: [] }))
  if (entities && typeof entities === 'string') {
    for (const sc of styledChars) sc.styles.push(entities)
  }
  if (Array.isArray(entities)) {
    for (const entity of entities) {
      const style = ENTITY_TYPES_MONOSPACE.includes(entity.type)
        ? 'monospace'
        : ENTITY_TYPES_MENTION.includes(entity.type)
          ? 'mention'
          : entity.type
      if (entity.type === 'custom_emoji' && styledChars[entity.offset]) {
        styledChars[entity.offset].customEmojiId = entity.custom_emoji_id
      }
      for (let i = entity.offset; i < entity.offset + entity.length; i++) {
        if (styledChars[i]) styledChars[i].styles.push(style)
      }
    }
  }
  return styledChars
}

function mapEmojis (text, styledChars) {
  const emojis = emojiDb.searchFromText({ input: text, fixCodePoints: true })
  for (let eIdx = 0; eIdx < emojis.length; eIdx++) {
    const emoji = emojis[eIdx]
    for (let i = emoji.offset; i < emoji.offset + emoji.length; i++) {
      if (styledChars[i]) styledChars[i].emoji = { index: eIdx, code: emoji.found }
    }
  }
  return emojis
}

async function loadEmojiImages (emojis, emojiBrand) {
  const emojiImageJson = loadBrand(emojiBrand || 'apple')
  const fallbackBrand = emojiBrand === 'blob' ? 'google' : 'apple'
  const fallbackJson = loadBrand(fallbackBrand)
  const localMap = new Map()
  const promises = []

  for (const emoji of emojis) {
    const cacheKey = `${emojiBrand}:${emoji.found}`
    if (emojiImageCache.has(cacheKey)) {
      localMap.set(emoji.found, emojiImageCache.get(cacheKey))
      continue
    }
    if (emojiLoadingPromises.has(cacheKey)) {
      promises.push(emojiLoadingPromises.get(cacheKey).then(img => {
        if (img) localMap.set(emoji.found, img)
      }))
      continue
    }

    const p = (async () => {
      let image = null
      const base = emojiImageJson[emoji.found]
      if (base) {
        try {
          image = await loadImage(Buffer.from(base, 'base64'))
        } catch (_) {
          try { image = await loadImage(Buffer.from(fallbackJson[emoji.found], 'base64')) } catch (_) {}
        }
      } else {
        try { image = await loadImage(Buffer.from(fallbackJson[emoji.found], 'base64')) } catch (_) {}
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

  await Promise.all(promises)
  return localMap
}

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

function tokenize (text, styledChars, fontSize, emojiMap, customEmojiMap) {
  const segments = []
  const emojiSize = fontSize * EMOJI_SCALE
  const wordSegs = [...wordSegmenter.segment(text)]

  for (const wordSeg of wordSegs) {
    const start = wordSeg.index
    const end = start + wordSeg.segment.length
    let subStart = start
    for (let i = start; i < end; i++) {
      const cur = styledChars[i]
      const prev = i > subStart ? styledChars[i - 1] : null
      const isBreak = cur.char.match(BREAK_REGEX)
      const needsSplit = isBreak || (prev && (
        (cur.emoji && !prev.emoji) ||
        (!cur.emoji && prev.emoji) ||
        (cur.emoji && prev.emoji && cur.emoji.index !== prev.emoji.index) ||
        (cur.styles.toString() !== prev.styles.toString())
      ))
      if (needsSplit) {
        if (i > subStart) pushSegment(segments, styledChars, subStart, i, fontSize, emojiSize, emojiMap, customEmojiMap)
        subStart = i
      }
    }
    if (subStart < end) pushSegment(segments, styledChars, subStart, end, fontSize, emojiSize, emojiMap, customEmojiMap)
  }
  return segments
}

function pushSegment (segments, styledChars, start, end, fontSize, emojiSize, emojiMap, customEmojiMap) {
  const first = styledChars[start]
  let text = ''
  for (let i = start; i < end; i++) text += styledChars[i].char
  let kind = 'text'
  if (text.match(BREAK_REGEX)) kind = 'break'
  else if (text.match(SPACE_REGEX) && !text.match(/\S/)) kind = 'space'
  else if (first.emoji) kind = 'emoji'

  let emojiImage = null
  const emojiCode = first.emoji ? first.emoji.code : null
  const customEmojiId = first.customEmojiId || null
  if (first.emoji) {
    if (customEmojiId && customEmojiMap[customEmojiId]) emojiImage = customEmojiMap[customEmojiId]
    else emojiImage = emojiMap.get(first.emoji.code) || null
    kind = 'emoji'
  }

  segments.push({
    text,
    kind,
    styles: [...first.styles],
    font: resolveFont(first.styles, fontSize),
    emojiImage,
    emojiCode,
    customEmojiId,
    width: 0,
    fontSize
  })
}

function splitCJKSegments (segments) {
  const result = []
  for (const seg of segments) {
    if (seg.kind !== 'text' || !seg.text.match(CJK_REGEX)) {
      result.push(seg)
      continue
    }
    const graphemes = [...graphemeSegmenter.segment(seg.text)]
    if (graphemes.length <= 1) {
      result.push(seg)
      continue
    }
    let runStart = 0
    let runIsCJK = !!graphemes[0].segment.match(CJK_REGEX)
    for (let g = 1; g <= graphemes.length; g++) {
      const curIsCJK = g < graphemes.length ? !!graphemes[g].segment.match(CJK_REGEX) : !runIsCJK
      if (curIsCJK !== runIsCJK || g === graphemes.length) {
        if (runIsCJK) {
          for (let j = runStart; j < g; j++) {
            result.push({ text: graphemes[j].segment, kind: 'text', styles: [...seg.styles], font: seg.font, emojiImage: null, emojiCode: null, customEmojiId: null, width: 0, fontSize: seg.fontSize })
          }
        } else {
          let runText = ''
          for (let j = runStart; j < g; j++) runText += graphemes[j].segment
          result.push({ text: runText, kind: 'text', styles: [...seg.styles], font: seg.font, emojiImage: null, emojiCode: null, customEmojiId: null, width: 0, fontSize: seg.fontSize })
        }
        runStart = g
        runIsCJK = curIsCJK
      }
    }
  }
  return result
}

function mergePunctuation (segments) {
  const result = []
  for (const seg of segments) {
    if (seg.kind === 'text' && seg.text.length === 1 && LEFT_STICKY_PUNCTUATION.has(seg.text) && result.length > 0) {
      const prev = result[result.length - 1]
      if (prev.kind === 'text' && prev.styles.toString() === seg.styles.toString()) {
        prev.text += seg.text
        prev.width = 0
        prev._graphemeWidths = null
        continue
      }
    }
    result.push(seg)
  }
  return result
}

function applyKinsoku (segments) {
  const result = []
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    if (seg.kind === 'text' && seg.text.length === 1 && KINSOKU_START.has(seg.text) && result.length > 0) {
      const prev = result[result.length - 1]
      if (prev.kind === 'text' && prev.styles.toString() === seg.styles.toString()) {
        prev.text += seg.text
        prev.width = 0
        prev._graphemeWidths = null
        continue
      }
    }
    if (seg.kind === 'text' && seg.text.length === 1 && KINSOKU_END.has(seg.text) && i + 1 < segments.length) {
      const next = segments[i + 1]
      if (next.kind === 'text' && seg.styles.toString() === next.styles.toString()) {
        segments[i + 1] = { text: seg.text + next.text, kind: next.kind, styles: [...next.styles], font: next.font, emojiImage: next.emojiImage, emojiCode: next.emojiCode, customEmojiId: next.customEmojiId, width: 0, fontSize: next.fontSize, _graphemeWidths: null }
        continue
      }
    }
    result.push(seg)
  }
  return result
}

function measureSegments (segments, fontSize) {
  const ctx = getMeasureCtx()
  const emojiSize = fontSize * EMOJI_SCALE
  let currentFont = null
  for (const seg of segments) {
    if (seg.kind === 'emoji') {
      seg.width = emojiSize
      continue
    }
    if (seg.kind === 'break') {
      seg.width = 0
      continue
    }
    if (currentFont !== seg.font) {
      ctx.font = seg.font
      currentFont = seg.font
    }
    seg.width = ctx.measureText(seg.text).width
  }
}

function computeGraphemeWidths (segment) {
  if (segment._graphemeWidths) return segment._graphemeWidths
  const ctx = getMeasureCtx()
  ctx.font = segment.font
  const graphemes = [...graphemeSegmenter.segment(segment.text)]
  const widths = graphemes.map(g => ctx.measureText(g.segment).width)
  const texts = graphemes.map(g => g.segment)
  segment._graphemeWidths = { widths, texts }
  return segment._graphemeWidths
}

async function prepareText (text, entities, fontSize, emojiBrand, telegram) {
  if (!text) {
    return {
      segments: [],
      fontSize,
      lineHeight: fontSize * 1.2,
      emojiSize: fontSize * EMOJI_SCALE,
      ...fontMetrics(fontSize),
      computeGraphemeWidths
    }
  }

  text = String(text).replace(/і/g, 'i')
  const styledChars = buildStyledChars(text, entities)
  const emojis = mapEmojis(text, styledChars)
  const emojiMap = await loadEmojiImages(emojis, emojiBrand)

  const customEmojiIds = []
  for (const sc of styledChars) {
    if (sc.customEmojiId && !customEmojiIds.includes(sc.customEmojiId)) customEmojiIds.push(sc.customEmojiId)
  }
  const customEmojiMap = await loadCustomEmojis(customEmojiIds, telegram)

  let segments = tokenize(text, styledChars, fontSize, emojiMap, customEmojiMap)
  segments = splitCJKSegments(segments)
  segments = mergePunctuation(segments)
  segments = applyKinsoku(segments)
  measureSegments(segments, fontSize)

  return {
    segments,
    fontSize,
    lineHeight: fontSize * 1.2,
    emojiSize: fontSize * EMOJI_SCALE,
    ...fontMetrics(fontSize),
    computeGraphemeWidths
  }
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
