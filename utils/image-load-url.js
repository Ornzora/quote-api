const https = require('https')
const http = require('http')
const dns = require('dns').promises
const net = require('net')

const REQUEST_TIMEOUT_MS = 10_000
const MAX_RESPONSE_BYTES = 20 * 1024 * 1024
const MAX_REDIRECTS = 5

function ipv4ToInt (ip) {
  return ip.split('.').reduce((n, part) => (n * 256) + Number(part), 0) >>> 0
}

function ipv4InRange (ip, base, bits) {
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask)
}

function isPrivateIp (ip) {
  if (net.isIPv4(ip)) {
    return [
      ['0.0.0.0', 8],
      ['10.0.0.0', 8],
      ['100.64.0.0', 10],
      ['127.0.0.0', 8],
      ['169.254.0.0', 16],
      ['172.16.0.0', 12],
      ['192.0.0.0', 24],
      ['192.0.2.0', 24],
      ['192.168.0.0', 16],
      ['198.18.0.0', 15],
      ['198.51.100.0', 24],
      ['203.0.113.0', 24],
      ['224.0.0.0', 4]
    ].some(([base, bits]) => ipv4InRange(ip, base, bits)) || ipv4ToInt(ip) >= ipv4ToInt('240.0.0.0')
  }

  const normalized = ip.toLowerCase()
  if (normalized === '::' || normalized === '::1') return true
  if (normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return true

  // IPv4-mapped IPv6 addresses can otherwise bypass IPv4 checks.
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return isPrivateIp(mapped[1])

  // IPv6 multicast and unspecified/documentation ranges are not valid public
  // image hosts for this loader.
  if (normalized.startsWith('ff')) return true
  return false
}

async function validateRemoteUrl (url) {
  const parsed = new URL(url)
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`Unsupported protocol ${parsed.protocol} for ${url}`)
  }
  if (parsed.username || parsed.password) {
    throw new Error(`Credentials in image URL are not allowed: ${url}`)
  }

  const addresses = net.isIP(parsed.hostname)
    ? [{ address: parsed.hostname }]
    : await dns.lookup(parsed.hostname, { all: true, verbatim: true })

  if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address))) {
    throw new Error(`Blocked private or internal image host: ${parsed.hostname}`)
  }

  return parsed
}

async function doRequest (url, filter, redirectCount) {
  const parsed = await validateRemoteUrl(url)
  const transport = parsed.protocol === 'https:' ? https : http

  return new Promise((resolve, reject) => {
    const options = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      headers: { 'User-Agent': 'curl/8.4.0' }
    }

    const req = transport.get(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        if (redirectCount >= MAX_REDIRECTS) {
          return reject(new Error(`Too many redirects (${MAX_REDIRECTS}) for ${url}`))
        }
        const redirectUrl = new URL(res.headers.location, url).href
        return resolve(doRequest(redirectUrl, filter, redirectCount + 1))
      }

      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume()
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`))
      }

      if (filter && filter(res.headers)) {
        res.resume()
        return resolve(Buffer.concat([]))
      }

      const chunks = []
      let totalBytes = 0

      res.on('error', (err) => reject(err))
      res.on('data', (chunk) => {
        totalBytes += chunk.length
        if (totalBytes > MAX_RESPONSE_BYTES) {
          req.destroy()
          res.destroy()
          return reject(new Error(`Response exceeded ${MAX_RESPONSE_BYTES} bytes for ${url}`))
        }
        chunks.push(chunk)
      })
      res.on('end', () => resolve(Buffer.concat(chunks)))
    })

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy()
      reject(new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms for ${url}`))
    })

    req.on('error', (err) => reject(err))
  })
}

module.exports = (url, filter = false) => doRequest(url, filter, 0)
