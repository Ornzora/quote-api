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
  const presetByValue = new Map(Object.entries(colorPresets).map(([name,value]) => [value.toUpperCase(),name]))
  const validColor = (value) => /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value).trim())

  const bgField = bg.closest('.field')
  const formatElement = document.querySelector('[data-select="format"]')
  const formatField = formatElement?.closest('.field')
  const widthField = $('width')?.closest('.field')
  const heightField = $('height')?.closest('.field')
  const scaleField = $('scale')?.closest('.field')
  const replyCheckField = $('hasReply')?.closest('.field')

  const makeColorOption = (name, value) => {
    const option = document.createElement('button')
    option.type = 'button'
    option.className = 'option'
    option.dataset.value = value
    option.setAttribute('role', 'option')
    option.textContent = `${name} — ${value.toUpperCase()}`
    return option
  }

  const createColorField = ([id,label]) => {
    const field = formatField.cloneNode(true)
    field.classList.add('color-field')
    const dropdown = field.querySelector('.dropdown')
    const trigger = dropdown?.querySelector('.dropdown-trigger')
    const triggerText = trigger?.querySelector('span')
    const menu = dropdown?.querySelector('.menu')
    if (!dropdown || !trigger || !triggerText || !menu) return field

    dropdown.dataset.select = id
    dropdown.id = `${id}Dropdown`
    const labelEl = field.querySelector('.label') || field.querySelector('label')
    if (labelEl) labelEl.textContent = label

    menu.innerHTML = ''
    Object.entries(colorPresets).forEach(([name,value]) => menu.appendChild(makeColorOption(name,value)))
    const customOption = document.createElement('button')
    customOption.type = 'button'
    customOption.className = 'option'
    customOption.dataset.value = 'custom'
    customOption.setAttribute('role', 'option')
    customOption.textContent = 'Custom HEX'
    menu.appendChild(customOption)

    const input = document.createElement('input')
    input.className = 'input color-custom'
    input.id = `${id}Custom`
    input.value = defaults[id]
    input.maxLength = 7
    input.spellcheck = false
    input.inputMode = 'text'
    input.placeholder = '#FFFFFF'
    input.setAttribute('aria-label', `${label} custom HEX`)
    input.hidden = true
    field.appendChild(input)

    const setValue = (value, focusCustom = false) => {
      const normalized = String(value || defaults[id]).trim().toUpperCase()
      const presetName = presetByValue.get(normalized)
      const optionValue = presetName ? colorPresets[presetName] : 'custom'
      triggerText.textContent = presetName ? `${presetName} — ${normalized}` : 'Custom HEX'
      menu.querySelectorAll('.option').forEach(option => option.classList.toggle('active', option.dataset.value === optionValue))
      if (optionValue === 'custom') {
        input.value = validColor(normalized) ? normalized : defaults[id]
        input.hidden = false
        if (focusCustom) input.focus()
      } else {
        input.value = normalized
        input.hidden = true
      }
      return optionValue === 'custom' ? input.value : colorPresets[presetName]
    }

    const sync = () => {
      const json = $('json')
      if (!json) return
      try {
        const payload = JSON.parse(json.value || '{}')
        const value = dropdown.dataset.value === 'custom' ? input.value.trim() : dropdown.dataset.value
        if (validColor(value)) payload[id] = value.toUpperCase()
        json.value = JSON.stringify(payload, null, 2)
      } catch (_) {}
    }

    trigger.addEventListener('click', (event) => {
      event.stopPropagation()
      document.querySelectorAll('.color-field .dropdown.open').forEach(other => {
        if (other !== dropdown) {
          other.classList.remove('open')
          other.querySelector('.dropdown-trigger')?.setAttribute('aria-expanded','false')
        }
      })
      const open = dropdown.classList.toggle('open')
      trigger.setAttribute('aria-expanded', String(open))
    })
    menu.querySelectorAll('.option').forEach(option => option.addEventListener('click', (event) => {
      event.stopPropagation()
      dropdown.dataset.value = option.dataset.value
      setValue(option.dataset.value === 'custom' ? defaults[id] : option.dataset.value, option.dataset.value === 'custom')
      dropdown.classList.remove('open')
      trigger.setAttribute('aria-expanded','false')
      sync()
    }))
    input.addEventListener('input', sync)
    input.addEventListener('change', sync)
    dropdown.dataset.value = setValue(defaults[id])
    return field
  }

  const makeGrid = (...fields) => {
    const grid = document.createElement('div')
    grid.className = 'grid2 customization-row'
    fields.forEach((field) => grid.appendChild(field))
    return grid
  }

  const [bubbleField,nameField,textField] = colors.map(createColorField)
  const grids = [bgField?.parentElement, formatField?.parentElement, widthField?.parentElement, scaleField?.parentElement]

  if (bgField && formatField && widthField && heightField && scaleField && replyCheckField && bubbleField && nameField && textField) {
    const parent = bgField.parentElement
    grids.forEach((grid,index) => { if (grid && !grids.slice(0,index).includes(grid)) grid.remove() })
    const replyRow = makeGrid(replyCheckField)
    replyRow.classList.add('full-row')
    parent.append(
      makeGrid(bgField,bubbleField),
      makeGrid(nameField,textField),
      makeGrid(formatField,scaleField),
      makeGrid(widthField,heightField),
      replyRow
    )
    const replyFields = $('replyFields')
    if (replyFields) parent.appendChild(replyFields)
  }

  const style = document.createElement('style')
  style.id = 'quotely-playground-fix'
  style.textContent = `
    html { scrollbar-width:none; }
    html::-webkit-scrollbar,body::-webkit-scrollbar,textarea::-webkit-scrollbar,.code::-webkit-scrollbar,*::-webkit-scrollbar { width:0!important;height:0!important;display:none!important; }
    .customization-row.full-row > .field { grid-column:1/-1; }
    .color-custom { margin-top:8px; }
  `
  document.head.appendChild(style)

  const syncColorsToJson = () => {
    const json = $('json')
    if (!json) return
    try {
      const payload = JSON.parse(json.value || '{}')
      for (const [id] of colors) {
        const dropdown = $(`${id}Dropdown`)
        const custom = $(`${id}Custom`)
        const value = dropdown?.dataset.value === 'custom' ? custom?.value.trim() : dropdown?.dataset.value
        if (validColor(value)) payload[id] = value.toUpperCase()
      }
      json.value = JSON.stringify(payload,null,2)
    } catch (_) {}
  }

  const setColorControl = (id,value) => {
    const dropdown = $(`${id}Dropdown`)
    const custom = $(`${id}Custom`)
    const triggerText = dropdown?.querySelector('.dropdown-trigger span')
    if (!dropdown || !custom || !triggerText) return
    const normalized = String(value || defaults[id]).trim().toUpperCase()
    const presetName = presetByValue.get(normalized)
    const selected = presetName ? colorPresets[presetName] : 'custom'
    dropdown.dataset.value = selected
    triggerText.textContent = presetName ? `${presetName} — ${normalized}` : 'Custom HEX'
    dropdown.querySelectorAll('.option').forEach(option => option.classList.toggle('active', option.dataset.value === selected))
    custom.value = validColor(normalized) ? normalized : defaults[id]
    custom.hidden = selected !== 'custom'
  }

  for (const [id] of colors) {
    setColorControl(id,defaults[id])
  }

  document.querySelectorAll('#name,#uid,#text,#avatar,#showAvatar,#bg,#width,#height,#scale,#replyName,#replyText').forEach((el) => {
    el.addEventListener('input',syncColorsToJson)
    el.addEventListener('change',syncColorsToJson)
  })

  const syncFieldsFromJson = () => {
    try {
      const payload = JSON.parse($('json').value || '{}')
      for (const [id] of colors) setColorControl(id,payload[id] || defaults[id])
    } catch (_) {}
  }

  $('applyJson')?.addEventListener('click',() => setTimeout(syncFieldsFromJson,0))
  $('reset')?.addEventListener('click',() => {
    for (const [id] of colors) setColorControl(id,defaults[id])
    setTimeout(syncColorsToJson,0)
  })

  const requestTable = document.querySelector('#request-doc table tbody')
  if (requestTable) for (const [id,label] of colors) {
    const row = document.createElement('tr')
    row.innerHTML = `<td><code>${id}</code></td><td>string</td><td>${label} as a hex color. Use a preset or enter a custom HEX value. Defaults to <code>${defaults[id]}</code>.</td>`
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
