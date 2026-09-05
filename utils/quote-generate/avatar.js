// utils/quote-generate/avatar.js

const { createCanvas, loadImage } = require('canvas')
const LRU = require('lru-cache')
const runes = require('runes')
const loadImageFromUrl = require('../image-load-url')
const { AVATAR_COLORS } = require('./constants')

const avatarCache = new LRU({ max: 20, maxAge: 1000 * 60 * 5 })

function avatarImageLetters (letters, color) {
  const size = 500
  const canvas = createCanvas(size, size)
  const context = canvas.getContext('2d')
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height)
  gradient.addColorStop(0, color[0])
  gradient.addColorStop(1, color[1])
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)
  const letterCount = runes(letters).length
  const fontSize = letterCount > 1 ? size * 0.38 : size * 0.48
  // Keep the fallback avatar independent of optional bundled fonts.
  // This prevents tofu/box glyphs on minimal serverless environments.
  context.font = `600 ${fontSize}px sans-serif`
  context.fillStyle = '#FFF'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(letters, size / 2, size / 2)
  return canvas
}

async function downloadAvatarImage (user, telegram) {
  let avatarImage
  let nameLetters
  if (user.first_name && user.last_name) {
    nameLetters = runes(user.first_name)[0] + runes(user.last_name || '')[0]
  } else {
    let name = user.first_name || (user.name && user.name !== false && user.name) || user.title || '?'
    if (typeof name !== 'string') name = String(name)
    name = name.toUpperCase()
    const words = name.split(' ')
    if (words.length > 1) nameLetters = runes(words[0])[0] + runes(words[words.length - 1])[0]
    else nameLetters = runes(words[0])[0]
  }

  const cacheKey = user.id != null ? user.id : `noId:${user.username || nameLetters}`
  const cached = avatarCache.get(cacheKey)
  const nameIndex = user.id != null ? Math.abs(user.id) % 7 : 0
  const avatarColor = AVATAR_COLORS[nameIndex]
  if (cached) return cached

  if (user.photo && user.photo.url) {
    avatarImage = await loadImage(user.photo.url).catch(() => null)
  }

  if (!avatarImage) {
    try {
      let userPhotoUrl
      if (user.photo && user.photo.big_file_id) {
        userPhotoUrl = await telegram.getFileLink(user.photo.big_file_id).catch(() => {})
      }
      if (!userPhotoUrl) {
        const getChat = user.id != null ? await telegram.getChat(user.id).catch(() => {}) : null
        if (getChat) {
          if (nameLetters === '?') {
            const chatName = getChat.first_name || getChat.title
            if (chatName) {
              const words = chatName.toUpperCase().split(' ')
              nameLetters = words.length > 1 ? runes(words[0])[0] + runes(words[words.length - 1])[0] : runes(words[0])[0]
            }
          }
          if (getChat.photo && getChat.photo.big_file_id) userPhotoUrl = await telegram.getFileLink(getChat.photo.big_file_id).catch(() => {})
        }
        if (!userPhotoUrl && user.username) userPhotoUrl = `https://telega.one/i/userpic/320/${user.username}.jpg`
      }
      if (userPhotoUrl) {
        const buffer = await loadImageFromUrl(userPhotoUrl).catch((error) => {
          console.warn('Failed to load user photo from URL:', error.message)
          return null
        })
        if (buffer) avatarImage = await loadImage(buffer).catch(() => null)
      }
      if (avatarImage) avatarCache.set(cacheKey, avatarImage)
    } catch (error) {
      console.warn('Error getting user photo:', error.message)
    }
  }

  if (!avatarImage) {
    try {
      avatarImage = avatarImageLetters(nameLetters, avatarColor)
      avatarCache.set(cacheKey, avatarImage)
    } catch (error) {
      console.warn('Failed to create letters avatar:', error.message)
    }
  }
  return avatarImage
}

async function drawAvatar (user, telegram) {
  try {
    const avatarImage = await downloadAvatarImage(user, telegram)
    if (!avatarImage) return null
    const avatarSize = avatarImage.naturalHeight || avatarImage.height
    const canvas = createCanvas(avatarSize, avatarSize)
    const canvasCtx = canvas.getContext('2d')
    canvasCtx.beginPath()
    canvasCtx.arc(avatarSize / 2, avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true)
    canvasCtx.save()
    canvasCtx.clip()
    canvasCtx.closePath()
    canvasCtx.drawImage(avatarImage, 0, 0, avatarSize, avatarSize)
    canvasCtx.restore()
    return canvas
  } catch (error) {
    console.warn('Error drawing avatar:', error.message)
    return null
  }
}

module.exports = { drawAvatar, downloadAvatarImage, avatarImageLetters }
