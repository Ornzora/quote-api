// utils/quote-generate/index.js

const fs = require('fs')
const path = require('path')
const { registerFont, loadImage } = require('canvas')
const { Telegram } = require('telegraf')
const loadImageFromUrl = require('../image-load-url')
const emojiDb = require('../emoji-db')

const { drawMultilineText } = require('./text-renderer')
const { drawAvatar } = require('./avatar')
const { downloadMediaImage } = require('./media')
const { drawQuote } = require('./composer')
const { drawLabel } = require('./canvas-utils')
const { loadIcons, drawVoiceRow, drawDocumentRow, drawAudioRow, formatDuration } = require('./attachments')
const { ColorContrast, lightOrDark, colorLuminance } = require('./color')
const { NAME_COLORS_LIGHT, NAME_COLORS_DARK } = require('./constants')

async function loadFonts () {
  const fontsDir = path.resolve(__dirname, '../../assets/fonts/')

  let files
  try {
    files = await fs.promises.readdir(fontsDir)
  } catch (err) {
    console.warn('Could not read fonts directory:', err.message)
    return
  }

  for (const file of files) {
    if (file.startsWith('.')) continue
    try {
      let family = file.replace(/\.[^/.]+$/, '')
      const desc = { }
      const m = family.match(/^(.*?)-(Regular|Bold|Italic|BoldItalic)$/)
      if (m) {
        family = m[1]
        if (m[2].includes('Bold')) desc.weight = 'bold'
        if (m[2].includes('Italic')) desc.style = 'italic'
      }
      registerFont(path.join(fontsDir, file), { family, ...desc })
    } catch (error) {
      console.warn(`${file} is not a font file`)
    }
  }
  console.log('Fonts loaded')
}

class QuoteGenerate {
  constructor (botToken) {
    this.telegram = new Telegram(botToken, process.env.BOT_API_ROOT ? { apiRoot: process.env.BOT_API_ROOT } : undefined)
  }

  async generate (backgroundColorOne, backgroundColorTwo, message, width, height, scale, emojiBrand) {
    await loadIcons()
    scale = scale || 2
    if (!Number.isFinite(scale) || scale < 1) scale = 1
    if (scale > 20) scale = 20
    width = Math.max(1, (width || 512) * scale)
    height = Math.max(1, (height || 512) * scale)

    const backStyle = lightOrDark(backgroundColorOne)
    const nameColorArray = backStyle === 'light' ? NAME_COLORS_LIGHT : NAME_COLORS_DARK
    const quoteColors = message.quoteColors || {}

    let nameIndex = 1
    if (message.from && message.from.id) nameIndex = Math.abs(message.from.id) % 7

    let nameColor = quoteColors.nameColor || nameColorArray[nameIndex]

    const colorContrast = new ColorContrast()
    if (!quoteColors.nameColor) {
      const contrast = colorContrast.getContrastRatio(colorLuminance(backgroundColorOne, 0.55), nameColor)
      if (contrast > 90 || contrast < 30) {
        nameColor = colorContrast.adjustContrast(colorLuminance(backgroundColorTwo, 0.55), nameColor)
      }
    }

    const nameSize = 18 * scale

    let nameCanvas
    if (message.from && message.from.name !== false && (message.from.name || message.from.first_name || message.from.last_name)) {
      let name = message.from.name || `${message.from.first_name || ''} ${message.from.last_name || ''}`.trim()
      if (!name) name = 'User'

      const nameEntities = [{
        type: 'bold',
        offset: 0,
        length: name.length
      }]

      if (message.from.emoji_status) {
        name += ' \uD83E\uDD21'
        nameEntities.push({
          type: 'custom_emoji',
          offset: name.length - 2,
          length: 2,
          custom_emoji_id: message.from.emoji_status
        })
      }

      try {
        nameCanvas = await drawMultilineText(
          name, nameEntities, nameSize, nameColor,
          0, nameSize, width, nameSize, emojiBrand, this.telegram
        )
        const nameHasEmoji = emojiDb.searchFromText({ input: name, fixCodePoints: true }).length > 0
        if (!message.from.emoji_status && !nameHasEmoji) {
          nameCanvas = gradientTint(nameCanvas, nameColor, colorLuminance(nameColor, 0.25))
        }
      } catch (error) {
        console.error('Failed to render name:', error.message, error.stack)
        try {
          const plainName = name.replace(/\s*\uD83E\uDD21$/, '')
          nameCanvas = await drawMultilineText(
            plainName, [{ type: 'bold', offset: 0, length: plainName.length }],
            nameSize, nameColor, 0, nameSize, width, nameSize, emojiBrand, this.telegram
          )
        } catch (_) { /* name is optional — continue without it */ }
      }
    }

    const fontSize = 24 * scale
    const textColor = quoteColors.textColor || (backStyle === 'light' ? '#000' : '#fff')

    let textCanvas
    let textBlocks = null
    if (message.text) {
      const text = typeof message.text === 'string' ? message.text : String(message.text)
      try {
        const parts = splitByBlockquotes(text, message.entities)
        if (parts) {
          textBlocks = []
          for (const part of parts) {
            const canvas = await drawMultilineText(
              part.text, part.entities, fontSize, textColor,
              0, fontSize, width, height - fontSize, emojiBrand, this.telegram
            )
            textBlocks.push({ canvas, quote: part.quote })
          }
          textCanvas = textBlocks[0] && textBlocks[0].canvas
        } else {
          textCanvas = await drawMultilineText(
            text, message.entities, fontSize, textColor,
            0, fontSize, width, height - fontSize, emojiBrand, this.telegram
          )
        }
      } catch (error) {
        console.error('Failed to render message text:', error.message, error.stack)
        try {
          textBlocks = null
          textCanvas = await drawMultilineText(
            text, [], fontSize, textColor,
            0, fontSize, width, height - fontSize, emojiBrand, this.telegram
          )
        } catch (retryError) {
          console.error('Failed to render plain text fallback:', retryError.message)
          return null
        }
      }
    }

    let avatarCanvas
    if (message.avatar && message.from) {
      try {
        avatarCanvas = await drawAvatar(message.from, this.telegram)
      } catch (error) {
        console.warn('Error drawing avatar:', error.message)
        avatarCanvas = null
      }
    }

    let replyData = null
    if (message.replyMessage && message.replyMessage.name && message.replyMessage.text) {
      try {
        const chatId = message.replyMessage.chatId || 0
        const replyNameIndex = Math.abs(chatId) % 7
        const replyNameColor = nameColorArray[replyNameIndex]

        const replyName = typeof message.replyMessage.name === 'string' ? message.replyMessage.name : String(message.replyMessage.name)
        const replyText = typeof message.replyMessage.text === 'string' ? message.replyMessage.text : String(message.replyMessage.text)

        const replyNameFontSize = 14 * scale
        const replyNameCanvas = await drawMultilineText(
          replyName, 'bold', replyNameFontSize, replyNameColor,
          0, replyNameFontSize, width * 0.9, replyNameFontSize, emojiBrand, this.telegram
        )

        const replyTextFontSize = 15 * scale
        const replyTextCanvas = await drawMultilineText(
          replyText, message.replyMessage.entities || [],
          replyTextFontSize, textColor,
          0, replyTextFontSize, width * 0.9, replyTextFontSize, emojiBrand, this.telegram
        )

        if (replyNameCanvas && replyTextCanvas) {
          replyData = { name: replyNameCanvas, nameColor: replyNameColor, text: replyTextCanvas }
          const replyMedia = message.replyMessage.media
          if (replyMedia && replyMedia.fileId) {
            try {
              const fileUrl = await this.telegram.getFileLink(replyMedia.fileId)
              const buffer = await loadImageFromUrl(fileUrl)
              replyData.thumb = await loadImage(buffer)
            } catch (error) {
              console.warn('Failed to load reply thumb:', error.message)
            }
          }
        }
      } catch (error) {
        console.error('Failed to render reply:', error.message, error.stack)
        replyData = null
      }
    }

    let mediaCanvas = null
    let mediaType = null
    let maxMediaSize = null

    if (message.media) {
      let media, type
      const crop = !!message.mediaCrop

      if (message.media.url) {
        type = 'url'
        media = message.media.url
      } else {
        type = 'id'
        if (message.media.length > 1) {
          media = crop ? message.media[1] : message.media[message.media.length - 1]
        } else {
          media = message.media[0]
        }
      }

      maxMediaSize = width * 2 / 3
      if (message.text && textCanvas && maxMediaSize < textCanvas.width) maxMediaSize = textCanvas.width

      if (media && media.is_animated) {
        if (media.thumb) {
          media = media.thumb
          maxMediaSize = maxMediaSize / 2
        } else {
          media = null
        }
      }

      try {
        mediaCanvas = await downloadMediaImage(media, maxMediaSize, type, crop, this.telegram)
        if (mediaCanvas) {
          mediaType = message.mediaType
        } else {
          console.warn('Failed to download media image, skipping')
        }
      } catch (error) {
        console.warn('Error downloading media image:', error.message)
      }
    }

    let attachment = null
    const attachMaxW = width * 2 / 3
    if (message.voice && Array.isArray(message.voice.waveform)) {
      attachment = drawVoiceRow(
        message.voice.waveform, message.voice.duration,
        nameColor, textColor, scale, attachMaxW
      )
    } else if (message.document) {
      attachment = drawDocumentRow(message.document, nameColor, textColor, scale, attachMaxW)
    } else if (message.audio) {
      let audioThumb = null
      const thumbId = message.audio.thumb && (message.audio.thumb.file_id || message.audio.thumb)
      if (thumbId) {
        try {
          const fileUrl = typeof thumbId === 'string' && thumbId.startsWith('http')
            ? thumbId
            : await this.telegram.getFileLink(thumbId)
          audioThumb = await loadImage(await loadImageFromUrl(fileUrl))
        } catch (error) {
          console.warn('Failed to load audio thumb:', error.message)
        }
      }
      attachment = drawAudioRow(message.audio, nameColor, textColor, scale, attachMaxW, audioThumb)
    }

    let mediaBadge = null
    if (mediaCanvas) {
      if (message.mediaType === 'video') {
        mediaBadge = { play: true, label: message.mediaDuration != null ? formatDuration(message.mediaDuration) : null }
      } else if (message.mediaType === 'gif' || message.mediaType === 'animation') {
        mediaBadge = { label: 'GIF' }
      }
    }

    const isForward = !!message.forward
    const forwardLabel = isForward ? (message.forward.label || 'Forwarded message') : null
    const senderTag = message.senderTag || null

    let viaBotCanvas = null
    if (message.viaBot) {
      const viaText = `via @${String(message.viaBot).replace(/^@/, '')}`
      viaBotCanvas = drawLabel(viaText, 13 * scale, nameColor, { alpha: 0.8 })
    }

    if (!textCanvas && !nameCanvas && !mediaCanvas && !replyData && !attachment) {
      return null
    }

    return drawQuote({
      scale,
      background: { colorOne: backgroundColorOne, colorTwo: backgroundColorTwo, textColor },
      bubbleColor: quoteColors.bubbleColor,
      avatar: avatarCanvas,
      reply: replyData,
      name: nameCanvas,
      text: textCanvas,
      textBlocks,
      media: mediaCanvas ? { canvas: mediaCanvas, type: mediaType, maxSize: maxMediaSize, badge: mediaBadge } : null,
      attachment: attachment ? { canvas: attachment } : null,
      isForward,
      forwardLabel,
      nameColor,
      senderTag,
      viaBot: viaBotCanvas,
      groupPos: message.groupPos || 'single',
      isQuote: !!message.isQuote
    })
  }
}

function gradientTint (canvas, colorFrom, colorTo) {
  if (!canvas || canvas.width < 2) return canvas
  const ctx = canvas.getContext('2d')
  const grad = ctx.createLinearGradient(0, 0, canvas.width, 0)
  grad.addColorStop(0, colorFrom)
  grad.addColorStop(1, colorTo)
  ctx.save()
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.restore()
  return canvas
}

function splitByBlockquotes (text, entities) {
  if (!Array.isArray(entities)) return null
  const quotes = entities
    .filter((e) => e.type === 'blockquote' || e.type === 'expandable_blockquote')
    .sort((a, b) => a.offset - b.offset)
  if (quotes.length === 0) return null

  const sliceEntities = (start, end) => entities
    .filter((e) => e.type !== 'blockquote' && e.type !== 'expandable_blockquote')
    .filter((e) => e.offset < end && e.offset + e.length > start)
    .map((e) => {
      const from = Math.max(e.offset, start)
      const to = Math.min(e.offset + e.length, end)
      return { ...e, offset: from - start, length: to - from }
    })

  const parts = []
  let pos = 0
  for (const q of quotes) {
    if (q.offset < pos) continue
    if (q.offset > pos) {
      const plain = text.slice(pos, q.offset).replace(/\n+$/, '')
      if (plain) parts.push({ text: plain, entities: sliceEntities(pos, q.offset), quote: false })
    }
    parts.push({ text: text.slice(q.offset, q.offset + q.length), entities: sliceEntities(q.offset, q.offset + q.length), quote: true })
    pos = q.offset + q.length
  }
  if (pos < text.length) {
    const tail = text.slice(pos).replace(/^\n+/, '')
    if (tail) parts.push({ text: tail, entities: sliceEntities(pos, text.length), quote: false })
  }
  return parts.length > 0 ? parts : null
}

module.exports = QuoteGenerate
module.exports.loadFonts = loadFonts
module.exports.gradientTint = gradientTint
