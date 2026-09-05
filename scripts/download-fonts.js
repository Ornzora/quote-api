const fs = require('fs/promises')
const path = require('path')

const fontsDir = path.resolve(__dirname, '../assets/fonts')
const referenceBase = 'https://raw.githubusercontent.com/Frenzycore/VoxLabs/main/public/fonts'
const notoBase = 'https://raw.githubusercontent.com/notofonts/noto-fonts/main/hinted/ttf'
const DOWNLOAD_TIMEOUT_MS = 15_000
const DOWNLOAD_RETRIES = 3

const fonts = {
  // UI fonts — exact assets from the supplied VoxLabs reference.
  'nunito-latin-400-normal.woff2': `${referenceBase}/nunito-latin-400-normal.woff2`,
  'nunito-latin-600-normal.woff2': `${referenceBase}/nunito-latin-600-normal.woff2`,
  'nunito-latin-700-normal.woff2': `${referenceBase}/nunito-latin-700-normal.woff2`,
  'nunito-latin-800-normal.woff2': `${referenceBase}/nunito-latin-800-normal.woff2`,
  'pacifico-latin-400-normal.woff2': `${referenceBase}/pacifico-latin-400-normal.woff2`,
  'pacifico-latin-400-normal.woff': `${referenceBase}/pacifico-latin-400-normal.woff`,

  // Canvas renderer fonts. These must be real TTF files because canvas
  // registerFont() cannot use the browser-only WOFF assets above.
  'NotoSans-Regular.ttf': `${notoBase}/NotoSans/NotoSans-Regular.ttf`,
  'NotoSans-Bold.ttf': `${notoBase}/NotoSans/NotoSans-Bold.ttf`,
  'NotoSans-Italic.ttf': `${notoBase}/NotoSans/NotoSans-Italic.ttf`,
  'NotoSans-BoldItalic.ttf': `${notoBase}/NotoSans/NotoSans-BoldItalic.ttf`,
  'NotoSansMono-Regular.ttf': `${notoBase}/NotoSansMono/NotoSansMono-Regular.ttf`,
  'NotoSansMono-Bold.ttf': `${notoBase}/NotoSansMono/NotoSansMono-Bold.ttf`
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
        const delay = attempt * 500
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

async function main () {
  await fs.mkdir(fontsDir, { recursive: true })

  for (const [name, url] of Object.entries(fonts)) {
    const destination = path.join(fontsDir, name)
    try {
      const stat = await fs.stat(destination)
      if (stat.size >= 1000) {
        console.log(`Font already exists: ${name}`)
        continue
      }
    } catch (_) {}

    console.log(`Downloading font: ${name}`)
    await download(url, destination)
  }

  console.log('All UI and renderer fonts ready')
}

main().catch(error => {
  console.error('Failed to download fonts:', error.message)
  process.exitCode = 1
})
