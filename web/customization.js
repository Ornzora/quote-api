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

  const formatField = document.querySelector('[data-select="format"]')?.closest('.field')
  if (!formatField) return

  const makeOption = (name, value) => {
    const option = document.createElement('button')
    option.type = 'button'
    option.className = 'option'
    option.dataset.value = value
    option.setAttribute('role','option')
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
    const labelEl = field.querySelector('.label')
    if (!dropdown || !trigger || !triggerText || !menu) return null
    if (labelEl) labelEl.textContent = label

    dropdown.dataset.select = id
    dropdown.id = `${id}Dropdown`
    menu.innerHTML = ''
    Object.entries(colorPresets).forEach(([name,value]) => menu.appendChild(makeOption(name,value)))
    menu.appendChild(makeOption('Custom HEX','custom'))

    const input = document.createElement('input')
    input.className = 'input color-custom'
    input.id = `${id}Custom`
    input.maxLength = 7
    input.spellcheck = false
    input.inputMode = 'text'
    input.placeholder = '#FFFFFF'
    input.setAttribute('aria-label',`${label} custom HEX`)
    input.hidden = true
    field.appendChild(input)

    const setValue = (value, focusCustom = false) => {
      const normalized = String(value || defaults[id]).trim().toUpperCase()
      const presetName = presetByValue.get(normalized)
      const selected = presetName ? colorPresets[presetName] : 'custom'
      dropdown.dataset.value = selected
      triggerText.textContent = presetName ? `${presetName} — ${normalized}` : 'Custom HEX'
      menu.querySelectorAll('.option').forEach(option => option.classList.toggle('active', option.dataset.value === selected))
      input.value = validColor(normalized) ? normalized : defaults[id]
      input.hidden = selected !== 'custom'
      if (focusCustom) input.focus()
    }

    trigger.addEventListener('click',(event) => {
      event.stopPropagation()
      document.querySelectorAll('.dropdown.open').forEach(other => {
        if (other !== dropdown) {
          other.classList.remove('open')
          other.querySelector('.dropdown-trigger')?.setAttribute('aria-expanded','false')
        }
      })
      const open = dropdown.classList.toggle('open')
      trigger.setAttribute('aria-expanded',String(open))
    })

    menu.querySelectorAll('.option').forEach(option => option.addEventListener('click',(event) => {
      event.stopPropagation()
      if (option.dataset.value === 'custom') {
        setValue(input.value || defaults[id],true)
        dropdown.dataset.value = 'custom'
      } else {
        setValue(option.dataset.value)
      }
      dropdown.classList.remove('open')
      trigger.setAttribute('aria-expanded','false')
      syncColorsToJson()
    }))
    input.addEventListener('input',syncColorsToJson)
    input.addEventListener('change',syncColorsToJson)
    setValue(defaults[id])
    return field
  }

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

  const [bubbleField,nameField,textField] = colors.map(createColorField)
  if (!bubbleField || !nameField || !textField) return

  // Only add the new color controls. Never remove or rebuild the existing controls.
  const originalGrid = bg.closest('.grid2')
  const colorRow1 = document.createElement('div')
  colorRow1.className = 'grid2 customization-row'
  colorRow1.append(bubbleField,nameField)
  const colorRow2 = document.createElement('div')
  colorRow2.className = 'grid2 customization-row'
  colorRow2.append(textField)
  originalGrid?.parentElement?.insertBefore(colorRow1, originalGrid.nextSibling)
  originalGrid?.parentElement?.insertBefore(colorRow2, colorRow1.nextSibling)

  const syncFieldsFromJson = () => {
    try {
      const payload = JSON.parse($('json').value || '{}')
      for (const [id] of colors) {
        const dropdown = $(`${id}Dropdown`)
        const custom = $(`${id}Custom`)
        const triggerText = dropdown?.querySelector('.dropdown-trigger span')
        if (!dropdown || !custom || !triggerText) continue
        const normalized = String(payload[id] || defaults[id]).trim().toUpperCase()
        const presetName = presetByValue.get(normalized)
        const selected = presetName ? colorPresets[presetName] : 'custom'
        dropdown.dataset.value = selected
        triggerText.textContent = presetName ? `${presetName} — ${normalized}` : 'Custom HEX'
        dropdown.querySelectorAll('.option').forEach(option => option.classList.toggle('active',option.dataset.value === selected))
        custom.value = validColor(normalized) ? normalized : defaults[id]
        custom.hidden = selected !== 'custom'
      }
    } catch (_) {}
  }

  $('applyJson')?.addEventListener('click',() => setTimeout(syncFieldsFromJson,0))
  $('reset')?.addEventListener('click',() => setTimeout(() => {
    for (const [id] of colors) {
      const dropdown = $(`${id}Dropdown`)
      const custom = $(`${id}Custom`)
      const triggerText = dropdown?.querySelector('.dropdown-trigger span')
      if (!dropdown || !custom || !triggerText) continue
      dropdown.dataset.value = defaults[id]
      triggerText.textContent = 'Custom HEX'
      dropdown.querySelectorAll('.option').forEach(option => option.classList.remove('active'))
      custom.value = defaults[id]
      custom.hidden = true
    }
    syncColorsToJson()
  },0))

  const requestTable = document.querySelector('#request-doc table tbody')
  if (requestTable) for (const [id,label] of colors) {
    const row = document.createElement('tr')
    row.innerHTML = `<td><code>${id}</code></td><td>string</td><td>${label} as a hex color. Use a preset or enter a custom HEX value. Defaults to <code>${defaults[id]}</code>.</td>`
    requestTable.appendChild(row)
  }

  const quickstart = document.querySelector('#quickstart .code')
  if (quickstart && !quickstart.textContent.includes('bubbleColor')) quickstart.textContent = quickstart.textContent.replace(/\n  ]\n}/,'\n  ],\n  "bubbleColor": "#FFFFFF",\n  "nameColor": "#000000",\n  "textColor": "#000000"\n}')

  const style = document.createElement('style')
  style.id = 'quotely-playground-fix'
  style.textContent = `
    html { scrollbar-width:none; }
    html::-webkit-scrollbar,body::-webkit-scrollbar,textarea::-webkit-scrollbar,.code::-webkit-scrollbar { width:0!important;height:0!important;display:none!important; }
    .color-custom { margin-top:8px; }
  `
  document.head.appendChild(style)

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
