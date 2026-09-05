// utils/quote-generate/composer.js
//
// Composes a quote bubble from pre-rendered canvases using a DOM/CSS-style
// box model (see layout-box.js): the bubble is a column with padding and a
// uniform vertical gap; every spacing constant lives in SP. No element is
// positioned with ad-hoc offsets — parents size themselves from children.

const { createCanvas } = require('canvas')
const { drawRoundRect, drawGradientRoundRect, roundImage, drawQuoteIcon, drawLabel, drawForwardLabel } = require('./canvas-utils')
const { paintMediaBadges } = require('./attachments')
const { leaf, box, measure, place, render } = require('./layout-box')

const SP = {
  padX: 16,
  padY: 12,
  gap: 5,
  headerGap: 8,
  maxHeader: 300,
  radius: 25,
  radiusGrouped: 7,
  replyThumb: 34,
  shadowPad: 12,
  shadowPadTop: 4,
  glass: 1.25,
  tail: 14,
  minWidth: 100,
  avatar: 50,
  avatarGap: 10,
  mediaRound: 12,
  block: { padY: 6, padL: 10, padR: 10, padRIcon: 22, bar: 3.5, icon: 15, iconInset: 5, radius: 7, tint: 0.14, gap: 3 }
}

function drawQuote (options) {
  const {
    scale = 1,
    background,
    bubbleColor,
    avatar,
    reply,
    name,
    text,
    textBlocks,
    media,
    attachment,
    isForward,
    forwardLabel,
    nameColor,
    senderTag,
    viaBot,
    groupPos = 'single',
    isQuote
  } = options

  const s = (v) => v * scale
  const accent = nameColor || background.textColor || '#fff'

  const mediaType = media ? media.type : null
  const mediaCanvas = media ? media.canvas : null
  const isSticker = mediaType === 'sticker'
  const nameCanvas = isSticker ? null : name

  let headerNode = null
  if (nameCanvas) {
    let tagLeaf = null
    if (senderTag) {
      tagLeaf = leaf(drawLabel(senderTag, s(13), background.textColor || '#fff', { alpha: 0.45 }))
    }
    const viaLeaf = viaBot ? leaf(viaBot) : null
    let nameMax = s(SP.maxHeader)
    if (viaLeaf) nameMax -= viaLeaf.w + s(6)
    if (tagLeaf) nameMax -= tagLeaf.w + s(SP.headerGap)
    const nameLeaf = leaf(nameCanvas, { maxW: Math.max(s(40), nameMax) })
    const nameSide = viaLeaf
      ? box({ dir: 'row', align: 'center', gap: s(6), children: [nameLeaf, viaLeaf] })
      : nameLeaf
    headerNode = tagLeaf
      ? box({ dir: 'row', justify: 'between', align: 'center', gap: s(SP.headerGap), stretch: true, children: [nameSide, tagLeaf] })
      : nameSide
  }

  let forwardNode = null
  if (isForward && forwardLabel) {
    forwardNode = leaf(drawForwardLabel(forwardLabel, s(13), accent), { maxW: s(SP.maxHeader) })
  }

  let replyNode = null
  if (reply) {
    const replyTexts = box({ dir: 'col', gap: s(SP.block.gap), children: [leaf(reply.name), leaf(reply.text)] })
    const inner = reply.thumb
      ? box({
        dir: 'row',
        gap: s(7),
        align: 'center',
        children: [
          leaf(reply.thumb, {
            trim: false,
            w: s(SP.replyThumb),
            h: s(SP.replyThumb),
            paint: (ctx, n) => ctx.drawImage(roundImage(coverSquare(n.canvas), s(4)), n.x, n.y, n.w, n.h)
          }),
          replyTexts
        ]
      })
      : replyTexts
    replyNode = accentBlock(s, reply.nameColor, { children: [inner] })
  }

  const mediaOnly = !!mediaCanvas && !nameCanvas && !text && !reply && !forwardLabel && !attachment

  const R = s(SP.radius)
  const rSmall = s(SP.radiusGrouped)
  const radii = {
    tl: groupPos === 'middle' || groupPos === 'last' ? rSmall : R,
    tr: R,
    br: R,
    bl: groupPos === 'first' || groupPos === 'middle' ? rSmall : R
  }

  const isRound = mediaType === 'video_note'
  const hasCaption = Boolean(text) || (Array.isArray(textBlocks) && textBlocks.length > 0) || Boolean(attachment)
  const flushable = !!mediaCanvas && !mediaOnly && !isSticker && !isRound
  const flushBottom = flushable && !hasCaption
  const flushTop = flushable && !nameCanvas && !(isForward && forwardLabel) && !reply

  let mediaNode = null
  if (mediaCanvas) {
    const maxMediaSize = media.maxSize
    let mediaWidth = mediaCanvas.width * (maxMediaSize / mediaCanvas.height)
    let mediaHeight = maxMediaSize
    if (mediaWidth >= maxMediaSize) {
      mediaWidth = maxMediaSize
      mediaHeight = mediaCanvas.height * (maxMediaSize / mediaCanvas.width)
    }
    const mr = s(SP.mediaRound)
    const mediaRadius = mediaOnly || isSticker
      ? s(SP.radius * 0.6)
      : {
        tl: flushTop ? radii.tl : mr,
        tr: flushTop ? radii.tr : mr,
        br: flushBottom ? radii.br : mr,
        bl: flushBottom ? radii.bl : mr
      }
    mediaNode = leaf(mediaCanvas, {
      trim: false,
      bleed: !isRound,
      w: isRound ? Math.min(mediaWidth, mediaHeight) : mediaWidth,
      h: isRound ? Math.min(mediaWidth, mediaHeight) : mediaHeight,
      paint: (ctx, n) => {
        ctx.save()
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        if (isRound) {
          ctx.beginPath()
          ctx.arc(n.x + n.w / 2, n.y + n.h / 2, n.w / 2, 0, Math.PI * 2)
          ctx.clip()
          ctx.drawImage(coverSquare(n.canvas), n.x, n.y, n.w, n.h)
        } else {
          const k = n.canvas.width / n.w
          const rSrc = typeof mediaRadius === 'number'
            ? mediaRadius * k
            : { tl: mediaRadius.tl * k, tr: mediaRadius.tr * k, br: mediaRadius.br * k, bl: mediaRadius.bl * k }
          ctx.drawImage(roundImage(n.canvas, rSrc), n.x, n.y, n.w, n.h)
        }
        if (media.badge) paintMediaBadges(ctx, n.x, n.y, n.w, n.h, media.badge, scale)
        ctx.restore()
      }
    })
  }

  const attachmentNode = attachment ? leaf(attachment.canvas) : null

  let textNode = null
  if (Array.isArray(textBlocks) && textBlocks.length > 0 && !isQuote) {
    const parts = textBlocks.map((b) => {
      if (b.quote) return accentBlock(s, accent, { icon: true, children: [leaf(b.canvas)] })
      const l = leaf(b.canvas)
      if (l) l.mt = s(2)
      return l
    })
    textNode = box({ dir: 'col', gap: s(5), children: parts })
  } else if (text) {
    textNode = isQuote
      ? accentBlock(s, accent, { icon: true, children: [leaf(text)] })
      : leaf(text)
  }
  if (textNode && !isQuote) textNode.mt = 0

  const bubblePad = {
    t: flushTop ? 0 : s(SP.padY),
    r: s(SP.padX),
    b: flushBottom ? 0 : s(SP.padY),
    l: s(SP.padX)
  }
  const tailSize = avatar ? s(SP.tail) : 0

  const bubbleBg = (ctx, n) => {
    // bubbleColor is deliberately independent from backgroundColor, which is
    // still used by the outer image/story wallpaper.
    const one = bubbleColor || background.colorOne
    const two = bubbleColor || background.colorTwo
    const glassLw = s(SP.glass)
    const rect = one === two
      ? drawRoundRect(one, n.w, n.h, radii, tailSize, glassLw)
      : drawGradientRoundRect(one, two, n.w, n.h, radii, tailSize, glassLw)
    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.24)'
    ctx.shadowBlur = s(6)
    ctx.shadowOffsetY = s(2)
    ctx.drawImage(rect, n.x - (rect._tailOffset || 0), n.y)
    ctx.restore()
  }

  let root
  if (isSticker) {
    const chip = replyNode
      ? box({
        pad: bubblePad,
        bg: (ctx, n) => ctx.drawImage(drawRoundRect('rgba(0, 0, 0, 0.5)', n.w, n.h, s(SP.radius), 0), n.x, n.y),
        children: [replyNode]
      })
      : null
    root = box({ dir: 'col', gap: s(SP.gap), children: [chip, mediaNode] })
  } else {
    root = box({
      dir: 'col',
      gap: s(SP.gap),
      pad: mediaOnly ? 0 : bubblePad,
      minW: mediaOnly ? 0 : s(SP.minWidth),
      bg: bubbleBg,
      children: [headerNode, forwardNode, replyNode, mediaNode, attachmentNode, textNode]
    })
  }

  measure(root)

  const shadowPad = s(SP.shadowPad)
  const shadowPadTop = s(SP.shadowPadTop)
  const bubblePosX = s(SP.avatar) + s(SP.avatarGap)
  const width = bubblePosX + root.w + shadowPad
  const height = shadowPadTop + Math.max(root.h, avatar ? s(SP.avatar) + s(2) : 0) + shadowPad

  place(root, bubblePosX, shadowPadTop)

  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  render(ctx, root)

  if (avatar) {
    const avatarY = Math.max(0, height - shadowPad - s(SP.avatar) - s(2))
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(avatar, 0, avatarY, s(SP.avatar), s(SP.avatar))
  }

  return canvas
}

function coverSquare (img) {
  const side = Math.min(img.width, img.height)
  if (img.width === img.height) return img
  const out = createCanvas(side, side)
  const ctx = out.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, side, side)
  return out
}

function accentBlock (s, accent, { icon = false, children }) {
  const b = SP.block
  return box({
    gap: s(b.gap),
    pad: { t: s(b.padY), r: s(icon ? b.padRIcon : b.padR), b: s(b.padY), l: s(b.padL) },
    bg: (ctx, n) => {
      const solid = drawRoundRect(accent, n.w, n.h, s(b.radius), 0)
      ctx.save()
      ctx.globalAlpha = b.tint
      ctx.drawImage(solid, n.x, n.y)
      ctx.restore()
      ctx.drawImage(solid, 0, 0, s(b.bar), n.h, n.x, n.y, s(b.bar), n.h)
      if (icon) ctx.drawImage(drawQuoteIcon(s(b.icon), accent, 1), n.x + n.w - s(b.icon) - s(b.iconInset), n.y + s(b.iconInset))
    },
    children
  })
}

module.exports = { drawQuote, SP }
