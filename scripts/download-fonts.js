const fs = require('fs/promises')
const path = require('path')

const fontsDir = path.resolve(__dirname, '../assets/fonts')
const base = 'https://raw.githubusercontent.com/Frenzycore/VoxLabs/main/public/fonts'

const fonts = {
  'nunito-latin-400-normal.woff2': `${base}/nunito-latin-400-normal.woff2`,
  'nunito-latin-600-normal.woff2': `${base}/nunito-latin-600-normal.woff2`,
  'nunito-latin-700-normal.woff2': `${base}/nunito-latin-700-normal.woff2`,
  'nunito-latin-800-normal.woff2': `${base}/nunito-latin-800-normal.woff2`,
  'pacifico-latin-400-normal.woff2': `${base}/pacifico-latin-400-normal.woff2`,
  'pacifico-latin-400-normal.woff': `${base}/pacifico-latin-400-normal.woff`
}

async function download (url, destination) {
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.length < 1000) throw new Error('downloaded file is unexpectedly small')
  await fs.writeFile(destination, buffer)
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

    console.log(`Downloading reference font: ${name}`)
    await download(url, destination)
  }

  console.log('Reference Vox Labs fonts ready')
}

main().catch(error => {
  console.error('Failed to download reference fonts:', error.message)
  process.exitCode = 1
})
