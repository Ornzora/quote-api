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
    pink: '#f68ac9', blue: '#6cace4', red: '#f44336', green: '#4caf50', yellow: '#ffeb3b',
    purple: '#9c27b0', darkblue: '#0d47a1', lightblue: '#03a9f4', grey: '#9e9e9e', orange: '#ff9800',
    black: '#000000', white: '#ffffff', teal: '#008080', lightred: '#ffc0cb', brown: '#a52a2a',
    salmon: '#ffa07a', magenta: '#ff00ff', tan: '#d2b48c', wheat: '#f5deb3', deeppink: '#ff1493',
    fire: '#b22222', skyblue: '#00bfff', brightorange: '#ff7f50', lightskyblue: '#1e90ff', hotpink: '#ff69b4',
    skybluegreen: '#87ceeb', seagreen: '#20b2aa', darkred: '#8b0000', redorange: '#ff4500', cyan: '#48d1cc',
    darkpurple: '#ba55d3', mossgreen: '#00ff7f', darkgreen: '#008000', midnightblue: '#191970', darkorange: '#ff8c00',
    blackishpurple: '#9400d3', fuchsia: '#ff00ff', darkmagenta: '#8b008b', darkgrey: '#2f4f4f', peachpuff: '#ffdab9',
    darkcrimson: '#dc143c', goldenrod: '#daa520', gold: '#ffd700', silver: '#c0c0c0', lavender: '#e6e6fa',
    indigo: '#4b0082', turquoise: '#40e0d0', coral: '#ff7f50', beige: '#f5f5dc', navy: '#000080', lime: '#00ff00'
  }

  const colors = [
    ['bubbleColor', 'Bubble color', defaults.bubbleColor],
    ['nameColor', 'Name color', defaults.nameColor],
    ['textColor', 'Text color', defaults.textColor]
  ]

  const presetEntries = Object.entries(colorPresets)
  const presetByValue = new Map(presetEntries.map(([name, value]) => [value.toUpperCase(), name]))
  const bgField = bg.closest('.field')

  const validColor = (value) => /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value).trim())

  const closeDropdowns = (except = null) => {
    document.querySelectorAll('.color-dropdown.open').forEach((dropdown) => {
      if (dropdown !== except) dropdown.classList.remove('open')
    })
  }

  const createColorField = ([id, label]) => {
    const field = document.createElement('div')
    field.className = 'field color-field'

    const dropdown = document.createElement('div')
    dropdown.className = 'dropdown color-dropdown'
    dropdown.id = `${id}Dropdown`
    dropdown.innerHTML = `
      <button class="dropdown-trigger" type="button" aria-haspopup="listbox" aria-expanded="false">
        <span class="color-selected"></span><span class="chevron"></span>
      </button>
      <div class="menu" role="listbox">
        ${presetEntries.map(([name, value]) => `<button class="option" type="button" role="option" data-value="${value}" data-name="${name}">${name} — ${value.toUpperCase()}</button>`).join('')}
        <button class="option" type="button" role="option" data-value="custom" data-name="custom">Custom HEX</button>
      </div>
    `

    const custom = document.createElement('input')
    custom.className = 'input color-custom'
    custom.id = id
    custom.value = defaults[id]
    custom.maxLength = 7
    custom.spellcheck = false
    custom.inputMode = 'text'
    custom.placeholder = '#FFFFFF'
    custom.setAttribute('aria-label', `${label} custom HEX`)
    custom.hidden = true

    field.innerHTML = `<label class="label" for="${id}">${label}</label>`
    field.append(dropdown, custom)
    return field
  }

  const colorFields = colors.map(createColorField)
  bgField?.after(...colorFields)

  const formatElement = $('format')
  const scaleElement = $('scale')
  const formatField = formatElement?.closest('.field')
  const scaleField = scaleElement?.closest('.field')

  // Keep output controls balanced: Format + Scale on one row, Reply Name + Reply Text below.
  if (formatField && scaleField && formatField !== scaleField) {
    const formatParent = formatField.parentElement
    const scaleParent = scaleField.parentElement
    const replyNameField = $('replyName')?.closest('.field')
    const replyTextField = $('replyText')?.closest('.field')

    const row = document.createElement('div')
    row.className = 'grid2 output-controls'
    row.append(formatField, scaleField)

    if (formatParent) formatParent.insertBefore(row, formatField.nextSibling)
    if (scaleParent && scaleParent !== formatParent && scaleParent.contains(scaleField)) scaleParent.removeChild(scaleField)

    if (replyNameField && replyTextField && replyNameField.parentElement === replyTextField.parentElement) {
      const replyGrid = replyNameField.parentElement
      if (replyGrid.classList.contains('grid2') && replyGrid.children.length === 2) {
        replyGrid.replaceWith(replyNameField, replyTextField)
      }
    }
  }

  const setColorControl = (id, value) => {
    const input = $(id)
    const dropdown = $(`${id}Dropdown`)
    if (!input || !dropdown) return

    const trigger = dropdown.querySelector('.dropdown-trigger')
    const selected = dropdown.querySelector('.color-selected')
    const options = dropdown.querySelectorAll('.option')
    const normalized = String(value || defaults[id]).trim().toUpperCase()
    const presetName = presetByValue.get(normalized)
    const optionValue = presetName ? colorPresets[presetName] : 'custom'

    if (presetName) {
      input.value = normalized
      input.hidden = true
      selected.textContent = `${presetName} — ${normalized}`
    } else {
      input.value = validColor(normalized) ? normalized : defaults[id]
      input.hidden = false
      selected.textContent = 'Custom HEX'
    }

    options.forEach((option) => option.classList.toggle('active', option.dataset.value === optionValue))
    trigger?.setAttribute('aria-expanded', 'false')
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

  for (const [id, label, fallback] of colors) {
    const dropdown = $(`${id}Dropdown`)
    const trigger = dropdown?.querySelector('.dropdown-trigger')
    const input = $(id)

    trigger?.addEventListener('click', (event) => {
      event.stopPropagation()
      const open = dropdown.classList.contains('open')
      closeDropdowns(dropdown)
      dropdown.classList.toggle('open', !open)
      trigger.setAttribute('aria-expanded', String(!open))
    })

    dropdown?.querySelectorAll('.option').forEach((option) => {
      option.addEventListener('click', () => {
        if (option.dataset.value === 'custom') {
          input.hidden = false
          input.focus()
          dropdown.querySelector('.color-selected').textContent = 'Custom HEX'
        } else {
          input.value = option.dataset.value.toUpperCase()
          input.hidden = true
          dropdown.querySelector('.color-selected').textContent = `${option.dataset.name} — ${input.value}`
          syncColorsToJson()
        }
        dropdown.querySelectorAll('.option').forEach((item) => item.classList.toggle('active', item === option))
        dropdown.classList.remove('open')
        trigger?.setAttribute('aria-expanded', 'false')
      })
    })

    input?.addEventListener('input', syncColorsToJson)
    input?.addEventListener('change', syncColorsToJson)
    setColorControl(id, fallback)
  }

  document.addEventListener('click', () => closeDropdowns())

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
