(() => {
  const $ = (id) => document.getElementById(id)
  const bg = $('bg')
  if (!bg) return

  const colors = [
    ['bubbleColor', 'Bubble color', '#FFFFFF'],
    ['nameColor', 'Name color', '#000000'],
    ['textColor', 'Text color', '#000000']
  ]

  const wrap = document.createElement('div')
  wrap.className = 'grid2 quote-colors'
  wrap.innerHTML = colors.map(([id, label, value]) => `
    <div class="field">
      <label class="label" for="${id}">${label}</label>
      <input class="input" id="${id}" value="${value}" maxlength="7" spellcheck="false" inputmode="text">
    </div>
  `).join('')

  bg.closest('.field').insertAdjacentElement('afterend', wrap)

  const validColor = (value) => /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim())
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
    } catch (_) {
      // Advanced JSON is allowed to be temporarily invalid while editing.
    }
  }

  const syncFieldsFromJson = () => {
    try {
      const payload = JSON.parse($('json').value || '{}')
      for (const [id, , fallback] of colors) $(id).value = payload[id] || fallback
    } catch (_) {}
  }

  for (const [id] of colors) {
    $(id).addEventListener('input', syncColorsToJson)
    $(id).addEventListener('change', syncColorsToJson)
  }

  // The original UI owns request serialization. Run after its listeners so
  // ordinary field edits cannot accidentally remove the color fields.
  document.querySelectorAll('#name,#uid,#text,#avatar,#showAvatar,#bg,#width,#height,#scale,#replyName,#replyText').forEach((el) => {
    el.addEventListener('input', syncColorsToJson)
    el.addEventListener('change', syncColorsToJson)
  })

  $('applyJson')?.addEventListener('click', () => setTimeout(syncFieldsFromJson, 0))
  $('reset')?.addEventListener('click', () => {
    for (const [id, , fallback] of colors) $(id).value = fallback
    setTimeout(syncColorsToJson, 0)
  })

  // Keep the documentation aligned with the actual request contract.
  const requestTable = document.querySelector('#request-doc table tbody')
  if (requestTable) {
    for (const [id, label] of colors) {
      const row = document.createElement('tr')
      row.innerHTML = `<td><code>${id}</code></td><td>string</td><td>${label} as a hex color. Defaults to <code>${id === 'bubbleColor' ? '#FFFFFF' : '#000000'}</code>.</td>`
      requestTable.appendChild(row)
    }
  }

  const quickstart = document.querySelector('#quickstart .code')
  if (quickstart && !quickstart.textContent.includes('bubbleColor')) {
    quickstart.textContent = quickstart.textContent.replace(
      /\n\s*"text": "Hello world!"/,
      '\n      "text": "Hello world!"\n    },\n  ],\n  "bubbleColor": "#FFFFFF",\n  "nameColor": "#000000",\n  "textColor": "#000000"'
    )
  }

  syncColorsToJson()
})()
