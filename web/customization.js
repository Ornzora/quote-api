(() => {
  const $ = (id) => document.getElementById(id)
  const bg = $('bg')
  if (!bg) return

  const defaults = { bubbleColor: '#FFFFFF', nameColor: '#000000', textColor: '#000000' }
  const colorPresets = {
    pink:'#f68ac9',blue:'#6cace4',red:'#f44336',green:'#4caf50',yellow:'#ffeb3b',purple:'#9c27b0',darkblue:'#0d47a1',lightblue:'#03a9f4',grey:'#9e9e9e',orange:'#ff9800',
    black:'#000000',white:'#ffffff',teal:'#008080',lightred:'#ffc0cb',brown:'#a52a2a',salmon:'#ffa07a',magenta:'#ff00ff',tan:'#d2b48c',wheat:'#f5deb3',deeppink:'#ff1493',
    fire:'#b22222',skyblue:'#00bfff',brightorange:'#ff7f50',lightskyblue:'#1e90ff',hotpink:'#ff69b4',skybluegreen:'#87ceeb',seagreen:'#20b2aa',darkred:'#8b0000',redorange:'#ff4500',cyan:'#48d1cc',
    darkpurple:'#ba55d3',mossgreen:'#00ff7f',darkgreen:'#008000',midnightblue:'#191970',darkorange:'#ff8c00',blackishpurple:'#9400d3',fuchsia:'#ff00ff',darkmagenta:'#8b008b',darkgrey:'#2f4f4f',peachpuff:'#ffdab9',
    darkcrimson:'#dc143c',goldenrod:'#daa520',gold:'#ffd700',silver:'#c0c0c0',lavender:'#e6e6fa',indigo:'#4b0082',turquoise:'#40e0d0',coral:'#ff7f50',beige:'#f5f5dc',navy:'#000080',lime:'#00ff00'
  }
  const colors = [['bubbleColor','Bubble color'],['nameColor','Name color'],['textColor','Text color']]
  const presetEntries = Object.entries(colorPresets)
  const presetByValue = new Map(presetEntries.map(([name,value]) => [value.toUpperCase(),name]))
  const validColor = (value) => /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value).trim())

  const bgField = bg.closest('.field')
  const formatElement = document.querySelector('[data-select="format"]')
  const formatField = formatElement?.closest('.field')
  const widthField = $('width')?.closest('.field')
  const heightField = $('height')?.closest('.field')
  const scaleField = $('scale')?.closest('.field')
  const replyCheckField = $('hasReply')?.closest('.field')

  // Clone the existing Format control instead of creating a second dropdown implementation.
  // This keeps the exact trigger/menu/chevron structure and behavior styling already used by the page.
  const createColorField = ([id,label]) => {
    const field = formatField.cloneNode(true)
    field.classList.add('color-field')
    const labelEl = field.querySelector('.label') || field.querySelector('label')
    if (labelEl) {
      labelEl.textContent = label
      labelEl.removeAttribute('for')
    }

    const dropdown = field.querySelector('.dropdown')
    if (!dropdown) return field
    dropdown.removeAttribute('data-select')
    dropdown.id = `${id}Dropdown`

    const trigger = dropdown.querySelector('.dropdown-trigger')
    const selected = trigger?.querySelector('.selected') || trigger?.querySelector('span:first-child')
    const menu = dropdown.querySelector('.menu')
    if (!trigger || !menu) return field

    menu.innerHTML = presetEntries.map(([name,value]) =>
      `<button class="option" type="button" role="option" data-value="${value}" data-name="${name}">${name} — ${value.toUpperCase()}</button>`
    ).join('') + '<button class="option" type="button" role="option" data-value="custom" data-name="custom">Custom HEX</button>'

    if (selected) selected.className = selected.className.replace(/\bselected\b/g,'').trim() + ' color-selected'
    if (selected) selected.textContent = ''

    const input = document.createElement('input')
    input.className = 'input color-custom'
    input.id = id
    input.value = defaults[id]
    input.maxLength = 7
    input.spellcheck = false
    input.inputMode = 'text'
    input.placeholder = '#FFFFFF'
    input.setAttribute('aria-label', `${label} custom HEX`)
    input.hidden = true
    field.appendChild(input)
    return field
  }

  const closeDropdowns = (except = null) => {
    document.querySelectorAll('.color-dropdown.open').forEach((dropdown) => {
      if (dropdown !== except) {
        dropdown.classList.remove('open')
        dropdown.querySelector('.dropdown-trigger')?.setAttribute('aria-expanded','false')
      }
    })
  }

  const setColorControl = (id,value) => {
    const input = $(id), dropdown = $(`${id}Dropdown`)
    if (!input || !dropdown) return
    const trigger = dropdown.querySelector('.dropdown-trigger')
    const selected = dropdown.querySelector('.color-selected')
    const options = dropdown.querySelectorAll('.option')
    const normalized = String(value || defaults[id]).trim().toUpperCase()
    const presetName = presetByValue.get(normalized)
    if (presetName) {
      input.value = normalized
      input.hidden = true
      if (selected) selected.textContent = `${presetName} — ${normalized}`
    } else {
      input.value = validColor(normalized) ? normalized : defaults[id]
      input.hidden = false
      if (selected) selected.textContent = 'Custom HEX'
    }
    options.forEach((option) => option.classList.toggle('active', option.dataset.value === (presetName ? colorPresets[presetName] : 'custom')))
    trigger?.setAttribute('aria-expanded','false')
  }

  const makeGrid = (...fields) => {
    const grid = document.createElement('div')
    grid.className = 'grid2 customization-row'
    fields.forEach((field) => grid.appendChild(field))
    return grid
  }

  const colorFields = colors.map(createColorField)
  colorFields.forEach((field) => field.querySelector('.dropdown')?.classList.add('color-dropdown'))
  const [bubbleField,nameField,textField] = colorFields

  const grids = [bgField?.parentElement, formatField?.parentElement, widthField?.parentElement, scaleField?.parentElement]
  if (bgField && formatField && widthField && heightField && scaleField && replyCheckField) {
    const parent = bgField.parentElement
    grids.forEach((grid,index) => { if (grid && !grids.slice(0,index).includes(grid)) grid.remove() })
    const backgroundRow = makeGrid(bgField,bubbleField)
    const textColorRow = makeGrid(nameField,textField)
    const outputRow = makeGrid(formatField,scaleField)
    const dimensionsRow = makeGrid(widthField,heightField)
    const replyRow = makeGrid(replyCheckField)
    replyRow.classList.add('full-row')
    parent.append(backgroundRow,textColorRow,outputRow,dimensionsRow,replyRow)
    const replyFields = $('replyFields')
    if (replyFields) parent.appendChild(replyFields)
  }

  const style = document.createElement('style')
  style.id = 'quotely-playground-fix'
  style.textContent = `
    html { scrollbar-width:none; }
    html::-webkit-scrollbar,body::-webkit-scrollbar,textarea::-webkit-scrollbar,.menu::-webkit-scrollbar,.code::-webkit-scrollbar,*::-webkit-scrollbar { width:0!important;height:0!important;display:none!important; }
    .customization-row.full-row > .field { grid-column:1/-1; }
    .color-dropdown .menu { scrollbar-width:none!important; overflow-y:auto; }
    .color-dropdown .menu::-webkit-scrollbar { display:none!important;width:0!important;height:0!important; }
  `
  document.head.appendChild(style)

  const syncColorsToJson = () => {
    const json = $('json')
    if (!json) return
    try {
      const payload = JSON.parse(json.value || '{}')
      for (const [id] of colors) {
        const value = $(id)?.value.trim()
        if (validColor(value)) payload[id] = value.toUpperCase()
      }
      json.value = JSON.stringify(payload,null,2)
    } catch (_) {}
  }

  const syncFieldsFromJson = () => {
    try {
      const payload = JSON.parse($('json').value || '{}')
      for (const [id] of colors) setColorControl(id,payload[id] || defaults[id])
    } catch (_) {}
  }

  for (const [id,label] of colors) {
    const dropdown = $(`${id}Dropdown`), trigger = dropdown?.querySelector('.dropdown-trigger'), input = $(id)
    trigger?.addEventListener('click',(event) => {
      event.stopPropagation()
      const open = dropdown.classList.contains('open')
      closeDropdowns(dropdown)
      dropdown.classList.toggle('open',!open)
      trigger.setAttribute('aria-expanded',String(!open))
    })
    dropdown?.querySelectorAll('.option').forEach((option) => option.addEventListener('click',() => {
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
      dropdown.querySelectorAll('.option').forEach((item) => item.classList.toggle('active',item === option))
      dropdown.classList.remove('open')
      trigger?.setAttribute('aria-expanded','false')
    }))
    input?.addEventListener('input',syncColorsToJson)
    input?.addEventListener('change',syncColorsToJson)
    setColorControl(id,defaults[id])
  }

  document.addEventListener('click',() => closeDropdowns())
  document.querySelectorAll('#name,#uid,#text,#avatar,#showAvatar,#bg,#width,#height,#scale,#replyName,#replyText').forEach((el) => {
    el.addEventListener('input',syncColorsToJson)
    el.addEventListener('change',syncColorsToJson)
  })
  $('applyJson')?.addEventListener('click',() => setTimeout(syncFieldsFromJson,0))
  $('reset')?.addEventListener('click',() => {
    for (const [id] of colors) setColorControl(id,defaults[id])
    setTimeout(syncColorsToJson,0)
  })

  const requestTable = document.querySelector('#request-doc table tbody')
  if (requestTable) for (const [id,label] of colors) {
    const row = document.createElement('tr')
    row.innerHTML = `<td><code>${id}</code></td><td>string</td><td>${label} as a hex color. Choose a preset or enter a custom HEX value. Defaults to <code>${defaults[id]}</code>.</td>`
    requestTable.appendChild(row)
  }

  const quickstart = document.querySelector('#quickstart .code')
  if (quickstart && !quickstart.textContent.includes('bubbleColor')) quickstart.textContent = quickstart.textContent.replace(/\n  ]\n}/,'\n  ],\n  "bubbleColor": "#FFFFFF",\n  "nameColor": "#000000",\n  "textColor": "#000000"\n}')

  const resultImage = $('resultImage')
  let previousUrl = null
  const observer = resultImage && new MutationObserver(() => {
    const nextUrl = resultImage.src
    if (previousUrl && previousUrl !== nextUrl) URL.revokeObjectURL(previousUrl)
    previousUrl = nextUrl
  })
  observer?.observe(resultImage,{attributes:true,attributeFilter:['src']})
  syncColorsToJson()
})()
