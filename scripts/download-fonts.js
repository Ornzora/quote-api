const fs = require('fs/promises')
const path = require('path')

const fontsDir = path.resolve(__dirname, '../assets/fonts')
const referenceBase = 'https://raw.githubusercontent.com/Frenzycore/VoxLabs/main/public/fonts'
const notoBase = 'https://raw.githubusercontent.com/notofonts/noto-fonts/main/hinted/ttf'
const cjkBase = 'https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/SubsetOTF'
const DOWNLOAD_TIMEOUT_MS = 30_000
const DOWNLOAD_RETRIES = 3

// ---------- Required fonts ----------
// UI fonts (woff2 for web playground) + base canvas renderer fonts
const fonts = {
  'nunito-latin-400-normal.woff2': `${referenceBase}/nunito-latin-400-normal.woff2`,
  'nunito-latin-600-normal.woff2': `${referenceBase}/nunito-latin-600-normal.woff2`,
  'nunito-latin-700-normal.woff2': `${referenceBase}/nunito-latin-700-normal.woff2`,
  'nunito-latin-800-normal.woff2': `${referenceBase}/nunito-latin-800-normal.woff2`,
  'pacifico-latin-400-normal.woff2': `${referenceBase}/pacifico-latin-400-normal.woff2`,
  'pacifico-latin-400-normal.woff': `${referenceBase}/pacifico-latin-400-normal.woff`,

  // Base canvas TTF fonts (Latin, Cyrillic, Greek, etc.)
  'NotoSans-Regular.ttf': `${notoBase}/NotoSans/NotoSans-Regular.ttf`,
  'NotoSans-Bold.ttf': `${notoBase}/NotoSans/NotoSans-Bold.ttf`,
  'NotoSans-Italic.ttf': `${notoBase}/NotoSans/NotoSans-Italic.ttf`,
  'NotoSans-BoldItalic.ttf': `${notoBase}/NotoSans/NotoSans-BoldItalic.ttf`,
  'NotoSansMono-Regular.ttf': `${notoBase}/NotoSansMono/NotoSansMono-Regular.ttf`,
  'NotoSansMono-Bold.ttf': `${notoBase}/NotoSansMono/NotoSansMono-Bold.ttf`
}

// ---------- Optional Unicode / script fonts ----------
// These are downloaded with graceful failure — if a URL is unreachable the
// install still succeeds and Pango falls back to system fonts (Docker has
// fonts-noto-cjk installed via apt which covers the gap).
const universalFonts = {
  // CJK — SubsetOTF (~3–5 MB each, much smaller than full CJK fonts)
  // NotoSansJP covers Japanese + most Chinese characters used in Japan
  'NotoSansJP-Regular.otf': `${cjkBase}/JP/NotoSansJP-Regular.otf`,
  'NotoSansJP-Bold.otf': `${cjkBase}/JP/NotoSansJP-Bold.otf`,
  // Simplified Chinese (additional hanzi coverage)
  'NotoSansSC-Regular.otf': `${cjkBase}/SC/NotoSansSC-Regular.otf`,
  // Korean
  'NotoSansKR-Regular.otf': `${cjkBase}/KR/NotoSansKR-Regular.otf`,

  // Right-to-left scripts
  'NotoSansArabic-Regular.ttf': `${notoBase}/NotoSansArabic/NotoSansArabic-Regular.ttf`,
  'NotoSansArabic-Bold.ttf': `${notoBase}/NotoSansArabic/NotoSansArabic-Bold.ttf`,
  'NotoSansHebrew-Regular.ttf': `${notoBase}/NotoSansHebrew/NotoSansHebrew-Regular.ttf`,

  // South / Southeast Asian scripts
  'NotoSansThai-Regular.ttf': `${notoBase}/NotoSansThai/NotoSansThai-Regular.ttf`,
  'NotoSansDevanagari-Regular.ttf': `${notoBase}/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf`,
  'NotoSansBengali-Regular.ttf': `${notoBase}/NotoSansBengali/NotoSansBengali-Regular.ttf`,
  'NotoSansTamil-Regular.ttf': `${notoBase}/NotoSansTamil/NotoSansTamil-Regular.ttf`,
  'NotoSansKhmer-Regular.ttf': `${notoBase}/NotoSansKhmer/NotoSansKhmer-Regular.ttf`,
  'NotoSansMyanmar-Regular.ttf': `${notoBase}/NotoSansMyanmar/NotoSansMyanmar-Regular.ttf`,

  // Other scripts
  'NotoSansGeorgian-Regular.ttf': `${notoBase}/NotoSansGeorgian/NotoSansGeorgian-Regular.ttf`,
  'NotoSansEthiopic-Regular.ttf': `${notoBase}/NotoSansEthiopic/NotoSansEthiopic-Regular.ttf`
}

async function download (url, destination) {
  let lastError
  for (let attempt = 1; attempt <= DOWNLOAD_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS)
      })
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      const buffer = Buffer.from(await response.arrayBuffer())
      if (buffer.length < 1000) throw new Error('downloaded file is unexpectedly small')
      await fs.writeFile(destination, buffer)
      return
    } catch (error) {
      lastError = error
      if (attempt < DOWNLOAD_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, attempt * 500))
      }
    }
  }
  throw lastError
}

async function downloadFont (name, url, optional = false) {
  const destination = path.join(fontsDir, name)
  try {
    const stat = await fs.stat(destination)
    if (stat.size >= 1000) {
      console.log(`  already cached: ${name}`)
      return true
    }
  } catch (_) {}

  process.stdout.write(`  downloading: ${name} ... `)
  try {
    await download(url, destination)
    console.log('ok')
    return true
  } catch (error) {
    if (optional) {
      console.log(`skipped (${error.message})`)
      return false
    }
    throw error
  }
}

async function main () {
  await fs.mkdir(fontsDir, { recursive: true })

  console.log('=== Required fonts ===')
  for (const [name, url] of Object.entries(fonts)) {
    await downloadFont(name, url, false)
  }

  console.log('\n=== Unicode / script fonts (optional) ===')
  console.log('  Failures are non-fatal — Pango falls back to system fonts.')
  let ok = 0, skipped = 0
  for (const [name, url] of Object.entries(universalFonts)) {
    const result = await downloadFont(name, url, true)
    result ? ok++ : skipped++
  }
  console.log(`\nDone. Required: ${Object.keys(fonts).length} fonts. Universal: ${ok} downloaded, ${skipped} skipped.`)
}

main().catch(error => {
  console.error('Failed to download required fonts:', error.message)
  process.exitCode = 1
})
