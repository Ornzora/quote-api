(() => {
  const $ = (id) => document.getElementById(id)
  const bg = $('bg')
  if (!bg) return

  const defaults = {
    bubbleColor: '#FFFFFF',
    nameColor: '#000000',
    textColor: '#000000'
  }

  const colorPresets = {
    pink: '#f68ac9',
    blue: '#6cace4',
    red: '#f44336',
    green: '#4caf50',
    yellow: '#ffeb3b',
    purple: '#9c27b0',
    darkblue: '#0d47a1',
    lightblue: '#03a9f4',
    grey: '#9e9e9e',
    orange: '#ff9800',
    black: '#000000',
    white: '#ffffff',
    teal: '#008080',
    lightred: '#ffc0cb',
    brown: '#a52a2a',
    salmon: '#ffa07a',
    magenta: '#ff00ff',
    tan: '#d2b48c',
    wheat: '#f5deb3',
    deeppink: '#ff1493',
    fire: '#b22222',
    skyblue: '#00bfff',
    brightorange: '#ff7f50',
    lightskyblue: '#1e90ff',
    hotpink: '#ff69b4',
    skybluegreen: '#87ceeb',
    seagreen: '#20b2aa',
    darkred: '#8b0000',
    redorange: '#ff4500',
    cyan: '#48d1cc',
    darkpurple: '#ba55d3',
    mossgreen: '#00ff7f',
    darkgreen: '#008000',
    midnightblue: '#191970',
    darkorange: '#ff8c00',
    blackishpurple: '#9400d3',
    fuchsia: '#ff00ff',
    darkmagenta: '#8b008b',
    darkgrey: '#2f4f4f',
    peachpuff: '#ffdab9',
    darkcrimson: '#dc143c',
    goldenrod: '#daa520',
    gold: '#ffd700',
    silver: '#c0c0c0',
    lavender: '#e6e6fa',
    indigo: '#4b0082',
    turquoise: '#40e0d0',
    coral: '#ff7f50',
    beige: '#f5f5dc',
    navy: '#000080',
    lime: '#00ff00'
  }

  const colors = [
    ['bubbleColor', 'Bubble color', defaults.bubbleColor],
    ['nameColor', 'Name color', defaults.nameColor],
    ['textColor', 'Text color', defaults.textColor]
  ]

  const presetEntries = Object.entries(colorPresets)
  const presetByValue = new Map(presetEntries.map(([name, value]) => [value.toUpperCase(), name]))

  const wrap = document.createElement('div')
  wrap.className = 'grid2 quote-colors'
  wrap.innerHTML = colors.map(([id, label]) => `
    <div class="field color-field">
      <label class="label" for="${id}Preset">${label}</label>
      <select class="select" id="${id}Preset">
        ${presetEntries.map(([name, value]) => `<option value="${value}">${name} — ${value.toUpperCase()}</option>`).join('')}
        <option value="custom">Custom HEX</option>
      </select>
      <input class="input color-custom" id="${id}" value="${defaults[id]}" maxlength="7" spellcheck="false" inputmode="text" placeholder="#FFFFFF" aria-label="${label} custom HEX" hidden>
    </div>
  `).join('')

  bg.closest('.field').insertAdjacentElement('afterend', wrap)

  const validColor = (value) => /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim())

  const setColorControl = (id, value) => {
    const input = $(id)
    const select = $(`${id}Preset`)
    if (!input || !select) return

    const normalized = String(value || defaults[id]).trim().toUpperCase()
    const presetName = presetByValue.get(normalized)

    if (presetName) {
      select.value = colorPresets[presetName]
      input.value = normalized
      input.hidden = true
    } else {
      select.value = 'custom'
      input.value = validColor(normalized) ? normalized : defaults[id]
      input.hidden = false
    }
  }

  const syncColorsToJson = () => {
    const json = $('json')
    if (!json) return
    try {
      const payload = JSON.parse(json.value || '{}')
      for (const [id] of colors) {
        const value = $(id).value.trim()
        if (validColor(value)) payload[id] = value.toUpperCase()
      }
      json.value = JSON.stringify(payload, null, 2)
    } catch (_) {}
  }

  const syncFieldsFromJson = () => {
    try {
      const payload = JSON.parse($('json').value || '{}')
      for (const [id, , fallback] of colors) setColorControl(id, payload[id] || fallback)
    } catch (_) {}
  }

  for (const [id] of colors) {
    const select = $(`${id}Preset`)
    const input = $(id)

    select.addEventListener('change', () => {
      if (select.value === 'custom') {
        input.hidden = false
        input.focus()
      } else {
        input.value = select.value.toUpperCase()
        input.hidden = true
        syncColorsToJson()
      }
    })

    input.addEventListener('input', syncColorsToJson)
    input.addEventListener('change', syncColorsToJson)
    setColorControl(id, defaults[id])
  }

  document.querySelectorAll('#name,#uid,#text,#avatar,#showAvatar,#bg,#width,#height,#scale,#replyName,#replyText').forEach((el) => {
    el.addEventListener('input', syncColorsToJson)
    el.addEventListener('change', syncColorsToJson)
  })

  $('applyJson')?.addEventListener('click', () => setTimeout(syncFieldsFromJson, 0))
  $('reset')?.addEventListener('click', () => {
    for (const [id, , fallback] of colors) setColorControl(id, fallback)
    setTimeout(syncColorsToJson, 0)
  })

  const requestTable = document.querySelector('#request-doc table tbody')
  if (requestTable) {
    for (const [id, label] of colors) {
      const row = document.createElement('tr')
      row.innerHTML = `<td><code>${id}</code></td><td>string</td><td>${label} as a hex color. Choose a preset or enter a custom HEX value. Defaults to <code>${id === 'bubbleColor' ? '#FFFFFF' : '#000000'}</code>.</td>`
      requestTable.appendChild(row)
    }
  }

  const quickstart = document.querySelector('#quickstart .code')
  if (quickstart && !quickstart.textContent.includes('bubbleColor')) {
    quickstart.textContent = quickstart.textContent.replace(
      /\n  ]\n}/,
      '\n  ],\n  "bubbleColor": "#FFFFFF",\n  "nameColor": "#000000",\n  "textColor": "#000000"\n}'
    )
  }

  // Revoke the previous preview object URL when the image source changes.
  const resultImage = $('resultImage')
  let previousUrl = null
  const observer = resultImage && new MutationObserver(() => {
    const nextUrl = resultImage.src
    if (previousUrl && previousUrl !== nextUrl) URL.revokeObjectURL(previousUrl)
    previousUrl = nextUrl
  })
  observer?.observe(resultImage, { attributes: true, attributeFilter: ['src'] })

  syncColorsToJson()
})()
