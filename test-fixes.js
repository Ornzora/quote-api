// Numeric and security regression assertions for quote rendering fixes.
// Run: node test-fixes.js  → exits non-zero on any failed assertion.

const assert = require('assert')
const { loadImage, createCanvas } = require('canvas')
const sharp = require('sharp')
const generateMethod = require('./methods/generate')
const generateApiMethod = require('./methods')
const QuoteGenerate = require('./utils/quote-generate')
const loadImageFromUrl = require('./utils/image-load-url')

// Count opaque pixels in the left avatar column (x < colW) of a PNG buffer.
function leftColumnInk (img, colW) {
  const canvas = createCanvas(img.width, img.height)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(0, 0, colW, img.height).data
  let n = 0
  for (let i = 3; i < data.length; i += 4) if (data[i] > 32) n++
  return n
}

function exactColorPixels (img, hex) {
  const value = hex.replace('#', '')
  const target = [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16)
  ]
  const canvas = createCanvas(img.width, img.height)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(0, 0, img.width, img.height).data
  let n = 0
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] === target[0] && data[i + 1] === target[1] && data[i + 2] === target[2] && data[i + 3] > 200) n++
  }
  return n
}

async function assertImageFormat (buffer, expected) {
  const metadata = await sharp(buffer).metadata()
  assert.strictEqual(metadata.format, expected, `expected ${expected} bytes, got ${metadata.format || 'unknown'}`)
}

async function assertRejected (promise, pattern, message) {
  await assert.rejects(promise, pattern, message)
}

async function main () {
  const scale = 2
  const msg = (chatId, text) => ({
    chatId,
    avatar: true,
    from: { id: chatId, name: `User ${chatId}`, photo: {} },
    text
  })

  // 1. Same-sender group renders ONE avatar (on the last bubble); the
  //    two-sender variant renders two. Avatar circles are solid disks of
  //    d = 50·scale, so the grouped left column must hold roughly half the
  //    opaque pixels of the ungrouped one (±25% for the tail overlap).
  const grouped = await generateMethod({ messages: [msg(7, 'перше'), msg(7, 'друге')], scale })
  const ungrouped = await generateMethod({ messages: [msg(7, 'перше'), msg(8, 'друге')], scale })
  assert.ok(!grouped.error && !ungrouped.error, 'generate failed')

  const colW = 50 * scale
  const inkGrouped = leftColumnInk(await loadImage(Buffer.from(grouped.image, 'base64')), colW)
  const inkUngrouped = leftColumnInk(await loadImage(Buffer.from(ungrouped.image, 'base64')), colW)
  const ratio = inkGrouped / inkUngrouped
  assert.ok(ratio > 0.35 && ratio < 0.65,
    `grouped/ungrouped avatar ink ratio ${ratio.toFixed(2)} — expected ≈ 0.5 (one avatar of two)`)

  // 2. Voice renders as an in-bubble attachment row capped at ⅔ of the
  //    target width. The bubble width is fully deterministic.
  const { drawVoiceRow } = require('./utils/quote-generate/attachments')
  const { NAME_COLORS_DARK } = require('./utils/quote-generate/constants')
  const waveform = Array.from({ length: 60 }, (_, i) => (i * 7) % 32)
  const qg = new QuoteGenerate('0:x')
  const voice = await qg.generate('#1b1429', '#1b1429', {
    from: { id: 1, name: 'V' },
    voice: { waveform, duration: 42 },
    avatar: false
  }, 512, 512, scale, 'apple')
  const row = drawVoiceRow(waveform, 42, NAME_COLORS_DARK[1], '#fff', scale, 512 * scale * 2 / 3)
  assert.ok(row.width <= Math.ceil(512 * scale * 2 / 3), `voice row ${row.width} exceeds ⅔ cap`)
  const expectedW = (50 + 10) * scale + (row.width + 2 * 16 * scale) + 12 * scale
  assert.ok(Math.abs(voice.width - expectedW) <= 2,
    `voice bubble width ${voice.width} != expected ${expectedW}`)

  // 3. Image mode: the wallpaper must contrast with the bubble, not blend.
  const brightness = (p) => (p.r * 299 + p.g * 587 + p.b * 114) / 1000
  for (const [bgColor, label] of [['#252e44', 'dark'], ['#e8ecf3', 'light']]) {
    const img = await generateMethod({ messages: [msg(7, 'контраст фону')], scale, type: 'image', backgroundColor: bgColor })
    assert.ok(!img.error, 'image generate failed')
    const pic = await loadImage(Buffer.from(img.image, 'base64'))
    const c = createCanvas(pic.width, pic.height)
    const cx = c.getContext('2d')
    cx.drawImage(pic, 0, 0)
    const get = (x, y) => {
      const d = cx.getImageData(x, y, 1, 1).data
      return { r: d[0], g: d[1], b: d[2] }
    }
    const wallPx = get(8, 8)
    const wall = brightness(wallPx)
    const bubble = brightness(get(95 * scale / 2 + (50 + 10 + 20) * scale, Math.round(pic.height / 2)))
    assert.ok(Math.abs(bubble - wall) >= 18,
      `${label}: bubble (${bubble.toFixed(0)}) blends into wallpaper (${wall.toFixed(0)})`)
    if (label === 'light') {
      const chroma = Math.max(wallPx.r, wallPx.g, wallPx.b) - Math.min(wallPx.r, wallPx.g, wallPx.b)
      assert.ok(chroma >= 15, `light wallpaper is gray (chroma ${chroma}) — expected a pastel tint`)
    }
    console.log(`  image/${label}: bubble ${bubble.toFixed(0)} vs wallpaper ${wall.toFixed(0)} (Δ${Math.abs(bubble - wall).toFixed(0)})`)
  }

  // 4. Color customization must reach the actual canvas renderer. Use the
  //    public method dispatcher here so its normalization layer injects the
  //    quoteColors object consumed by QuoteGenerate/composer.
  const colored = await generateApiMethod('generate', {
    width: 512,
    height: 512,
    scale: 1,
    bubbleColor: '#FF0000',
    nameColor: '#00FF00',
    textColor: '#0000FF',
    messages: [{
      from: { id: 1, name: 'Alice', photo: {} },
      text: 'Hello world',
      avatar: false
    }]
  })
  assert.ok(!colored.error, `color customization failed: ${colored.error || 'unknown error'}`)
  const coloredImage = await loadImage(Buffer.from(colored.image, 'base64'))
  assert.ok(exactColorPixels(coloredImage, '#FF0000') > 500, 'custom bubbleColor was not rendered')
  assert.ok(exactColorPixels(coloredImage, '#00FF00') > 5, 'custom nameColor was not rendered')
  assert.ok(exactColorPixels(coloredImage, '#0000FF') > 5, 'custom textColor was not rendered')

  // 5. JSON/base64 and direct method/extension paths must contain the bytes
  //    they claim, not PNG bytes relabeled as WebP.
  const jsonPng = await generateApiMethod('generate', { messages: [msg(1, 'format png')], format: 'png' })
  const jsonWebp = await generateApiMethod('generate', { messages: [msg(1, 'format webp')], format: 'webp' })
  const directMethodWebp = await generateMethod({ messages: [msg(1, 'direct method webp')], format: 'webp' })
  const directWebp = await generateApiMethod('generate', { messages: [msg(1, 'direct webp')], format: 'png', ext: 'webp' })
  assert.ok(!jsonPng.error && !jsonWebp.error && !directMethodWebp.error && !directWebp.error, 'format generation failed')
  await assertImageFormat(Buffer.from(jsonPng.image, 'base64'), 'png')
  await assertImageFormat(Buffer.from(jsonWebp.image, 'base64'), 'webp')
  await assertImageFormat(Buffer.from(directMethodWebp.image, 'base64'), 'webp')
  await assertImageFormat(directWebp.image, 'webp')

  // 6. Public validation must reject NaN/infinite/oversized dimensions,
  //    unsafe scale values, invalid formats, and malformed HEX colors.
  for (const payload of [
    { width: NaN },
    { width: Infinity },
    { height: 0 },
    { height: 2049 },
    { scale: NaN },
    { scale: 5 },
    { format: 'gif' },
    { bubbleColor: 'red' },
    { nameColor: '#12' },
    { textColor: '#12345G' }
  ]) {
    const result = await generateApiMethod('generate', { ...payload, messages: [msg(1, 'invalid input')] })
    assert.ok(result.error, `invalid payload was accepted: ${JSON.stringify(payload)}`)
  }

  // 7. Remote image loading must reject local/private destinations before any
  //    network request. Redirects are revalidated by doRequest().
  await assertRejected(
    loadImageFromUrl('http://127.0.0.1/image.png'),
    /Blocked private or internal image host/,
    'loopback image URL was not blocked'
  )
  await assertRejected(
    loadImageFromUrl('http://169.254.169.254/latest/meta-data/'),
    /Blocked private or internal image host/,
    'link-local metadata URL was not blocked'
  )
  await assertRejected(
    loadImageFromUrl('http://user:pass@example.com/image.png'),
    /Credentials in image URL are not allowed/,
    'credential-bearing image URL was not blocked'
  )

  console.log('OK: fixes assertions passed')
  console.log(`  avatar ink ratio grouped/ungrouped = ${ratio.toFixed(3)} (≈0.5)`)
  console.log(`  voice bubble width = ${voice.width} (expected ${expectedW}, row ${row.width})`)
  console.log('  customization colors rendered: bubble/name/text')
  console.log('  PNG/WebP byte formats verified')
  console.log('  invalid dimensions/colors/formats rejected')
  console.log('  private image hosts and URL credentials blocked')
}

main().catch((err) => {
  console.error('FAIL:', err.message)
  process.exit(1)
})
