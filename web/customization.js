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

  // The page already has a custom dropdown component. Color controls use the exact same structure/classes.
  const createColorField = ([id, label]) => {
    const field = document.createElement('div')
    field.className = 'field color-field'

    const dropdown = document.createElement('div')
    dropdown.className = 'dropdown color-dropdown'
    dropdown.id = `${id}Dropdown`
    dropdown.innerHTML = `
      <button class="dropdown-trigger" type="button" aria-haspopup="listbox" aria-expanded="false">
        <span class="color-selected"></span><span class="chevron" aria-hidden="true"></span>
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

  const validColor = (value) => /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value).trim())

  const closeDropdowns = (except = null) => {
    document.querySelectorAll('.color-dropdown.open').forEach((dropdown) => {
      if (dropdown !== except) {
        dropdown.classList.remove('open')
        dropdown.querySelector('.dropdown-trigger')?.setAttribute('aria-expanded', 'false')
      }
    })
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

    if (presetName) {
      input.value = normalized
      input.hidden = true
      selected.textContent = `${presetName} — ${normalized}`
    } else {
      input.value = validColor(normalized) ? normalized : defaults[id]
      input.hidden = false
      selected.textContent = 'Custom HEX'
    }

    options.forEach((option) => {
      const activeValue = presetName ? colorPresets[presetName] : 'custom'
      option.classList.toggle('active', option.dataset.value === activeValue)
    })
    trigger?.setAttribute('aria-expanded', 'false')
  }

  const insertBefore = (parent, before, ...nodes) => {
    nodes.forEach((node) => parent.insertBefore(node, before))
  }

  const makeGrid = (...fields) => {
    const grid = document.createElement('div')
    grid.className = 'grid2 customization-row'
    fields.forEach((field) => grid.appendChild(field))
    return grid
  }

  const bgField = bg.closest('.field')
  const bgGrid = bgField?.parentElement
  const formatField = $('format')?.closest('.field')
  const formatGrid = formatField?.parentElement
  const widthField = $('width')?.closest('.field')
  const widthGrid = widthField?.parentElement
  const heightField = $('height')?.closest('.field')
  const scaleField = $('scale')?.closest('.field')
  const scaleGrid = scaleField?.parentElement
  const replyCheckField = $('hasReply')?.closest('.field')
  const replyGrid = replyCheckField?.parentElement

  const colorFields = colors.map(createColorField)
  const [bubbleField, nameField, textField] = colorFields

  // Rebuild only the small request-control portion. Existing fields, styles and behavior stay intact.
  // Rows become: Background/Bubble, Name/Text, Format/Scale, Width/Height, Reply.
  if (bgGrid && formatField && widthGrid && scaleGrid && replyCheckField) {
    const parent = bgGrid.parentElement

    bgGrid.remove()
    if (formatGrid && formatGrid !== bgGrid) formatGrid.remove()
    if (widthGrid && widthGrid !== bgGrid) widthGrid.remove()
    if (scaleGrid && scaleGrid !== bgGrid) scaleGrid.remove()

    const backgroundRow = makeGrid(bgField, bubbleField)
    const textColorRow = makeGrid(nameField, textField)
    const outputRow = makeGrid(formatField, scaleField)
    const dimensionsRow = makeGrid(widthField, heightField)

    const replyRow = makeGrid(replyCheckField)
    replyRow.classList.add('full-row')

    // Keep the hidden reply fields in their original position after the reply toggle.
    const replyFields = $('replyFields')
    if (replyGrid && replyGrid !== scaleGrid && replyGrid !== widthGrid) replyGrid.remove()

    insertBefore(parent, replyFields || null, backgroundRow, textColorRow, outputRow, dimensionsRow, replyRow)

    if (replyFields) parent.appendChild(replyFields)
  }

  // Hide every scrollbar visually while preserving normal scrolling and scrollable dropdown menus.
  const scrollbarStyle = document.createElement('style')
  scrollbarStyle.id = 'quotely-scrollbar-fix'
  scrollbarStyle.textContent = `
    html { scrollbar-width: none; }
    html::-webkit-scrollbar, body::-webkit-scrollbar, *::-webkit-scrollbar { width: 0 !important; height: 0 !important; display: none !important; }
  `
  document.head.appendChild(scrollbarStyle)

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

  function syncColorsToJson() {
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

  function syncFieldsFromJson() {
    try {
      const payload = JSON.parse($('json').value || '{}')
      for (const [id, , fallback] of colors) setColorControl(id, payload[id] || fallback)
    } catch (_) {}
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
