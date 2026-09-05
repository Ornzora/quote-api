const fs = require('fs/promises')
const path = require('path')

const fontsDir = path.resolve(__dirname, '../assets/fonts')
const base = 'https://raw.githubusercontent.com/notofonts/noto-fonts/main/hinted/ttf'

const fonts = {
  'NotoSans-Regular.ttf': `${base}/NotoSans/NotoSans-Regular.ttf`,
  'NotoSans-Bold.ttf': `${base}/NotoSans/NotoSans-Bold.ttf`,
  'NotoSans-Italic.ttf': `${base}/NotoSans/NotoSans-Italic.ttf`,
  'NotoSans-BoldItalic.ttf': `${base}/NotoSans/NotoSans-BoldItalic.ttf`,
  'NotoSansMono-Regular.ttf': `${base}/NotoSansMono/NotoSansMono-Regular.ttf`,
  'NotoSansMono-Bold.ttf': `${base}/NotoSansMono/NotoSansMono-Bold.ttf`
}

async function download (url, destination) {
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.length < 10000) throw new Error('downloaded file is unexpectedly small')
  await fs.writeFile(destination, buffer)
}

async function main () {
  await fs.mkdir(fontsDir, { recursive: true })

  for (const [name, url] of Object.entries(fonts)) {
    const destination = path.join(fontsDir, name)
    try {
      const stat = await fs.stat(destination)
      if (stat.size >= 10000) {
        console.log(`Font already exists: ${name}`)
        continue
      }
    } catch (_) {}

    console.log(`Downloading ${name}...`)
    await download(url, destination)
  }

  console.log('Noto fonts ready')
}

main().catch(error => {
  console.error('Failed to download Noto fonts:', error.message)
  process.exitCode = 1
})
