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
    const field = $(`${id}Field`)
    if (!field) return null
    const dropdown = field.querySelector('.dropdown')
    let trigger = dropdown?.querySelector('.dropdown-trigger')
    const trigger = dropdown?.querySelector('.dropdown-trigger')
    const menu = dropdown?.querySelector('.menu')
    const labelEl = field.querySelector('.label')
    if (!dropdown || !trigger || !menu) return null
    if (labelEl) labelEl.textContent = label

    dropdown.dataset.select = id
    dropdown.id = `${id}Dropdown`
    menu.innerHTML = ''
    Object.entries(colorPresets).forEach(([name,value]) => menu.appendChild(makeOption(name,value)))
    menu.appendChild(makeOption('Custom HEX','custom'))

    // The editable HEX value occupies the dropdown trigger itself. It is not
    // an extra field below the selector, so the control rows stay compact.
    const input = document.createElement('input')
    input.className = 'color-inline-input'
    input.id = `${id}Custom`
    input.type = 'text'
    input.maxLength = 7
    input.spellcheck = false
    input.inputMode = 'text'
    input.placeholder = '#FFFFFF'
    input.setAttribute('aria-label',`${label} custom HEX`)
    input.readOnly = true

    const menuToggle = document.createElement('button')
    menuToggle.className = 'color-menu-toggle'
    menuToggle.type = 'button'
    menuToggle.setAttribute('aria-label', `Choose ${label.toLowerCase()}`)
    menuToggle.setAttribute('aria-haspopup', 'listbox')
    menuToggle.setAttribute('aria-expanded', 'false')
    menuToggle.innerHTML = '<span class="chevron" aria-hidden="true"></span>'

    // The source trigger is a <button>. Replace it with a neutral container
    // before adding the editable input and preset-menu button; nested buttons
    // are invalid HTML and can cause browsers to drop the colour control.
    const colorTrigger = document.createElement('div')
    colorTrigger.className = `${trigger.className} color-trigger`
    trigger.replaceWith(colorTrigger)
    trigger = colorTrigger
    trigger.classList.add('color-trigger')
    trigger.replaceChildren(input, menuToggle)

    const setValue = (value, focusCustom = false) => {
      const normalized = String(value || defaults[id]).trim().toUpperCase()
      const presetName = presetByValue.get(normalized)
      const selected = presetName ? colorPresets[presetName] : 'custom'
      dropdown.dataset.value = selected
      input.value = presetName ? `${presetName} — ${normalized}` : normalized
      input.readOnly = selected !== 'custom'
      menu.querySelectorAll('.option').forEach(option => option.classList.toggle('active', option.dataset.value === selected))
      if (focusCustom) input.focus()
    }

    // A custom value may happen to equal a preset (for example #FFFFFF).
    // Selecting "Custom HEX" must still reveal the input instead of routing
    // back through setValue(), which correctly recognizes that preset.
    const selectCustom = () => {
      const currentValue = dropdown.dataset.value === 'custom' ? input.value : dropdown.dataset.value
      dropdown.dataset.value = 'custom'
      input.value = validColor(currentValue) ? currentValue.trim().toUpperCase() : defaults[id]
      input.readOnly = false
      menu.querySelectorAll('.option').forEach(option => option.classList.toggle('active', option.dataset.value === 'custom'))
      requestAnimationFrame(() => input.focus())
    }

    const toggleMenu = (event) => {
      dropdown.dataset.value = 'custom'
      triggerText.textContent = 'Custom HEX'
      menu.querySelectorAll('.option').forEach(option => option.classList.toggle('active', option.dataset.value === 'custom'))
      input.value = validColor(input.value) ? input.value.trim().toUpperCase() : defaults[id]
      input.hidden = false
      requestAnimationFrame(() => input.focus())
    }

    trigger.addEventListener('click',(event) => {
      event.stopPropagation()
      document.querySelectorAll('.dropdown.open').forEach(other => {
        if (other !== dropdown) {
          other.classList.remove('open')
          other.querySelectorAll('[aria-haspopup="listbox"]').forEach(control => control.setAttribute('aria-expanded','false'))
        }
      })
      const open = dropdown.classList.toggle('open')
      menuToggle.setAttribute('aria-expanded',String(open))
    }

    input.addEventListener('click', (event) => {
      if (input.readOnly) toggleMenu(event)
      else event.stopPropagation()
    })
    menuToggle.addEventListener('click', toggleMenu)

    menu.querySelectorAll('.option').forEach(option => option.addEventListener('click',(event) => {
      event.stopPropagation()
      if (option.dataset.value === 'custom') {
        selectCustom()
      } else {
        setValue(option.dataset.value)
      }
      dropdown.classList.remove('open')
      menuToggle.setAttribute('aria-expanded','false')
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

  // The original playground script rebuilds Advanced JSON when a base field
  // changes. Re-apply colour fields afterwards so a valid custom HEX is not
  // silently dropped before Generate is pressed.
  ;['name','uid','text','avatar','showAvatar','bg','width','height','scale','replyName','replyText','hasReply'].forEach(id => {
    $(id)?.addEventListener('input', () => setTimeout(syncColorsToJson, 0))
    $(id)?.addEventListener('change', () => setTimeout(syncColorsToJson, 0))
  })

  // The original playground script rebuilds Advanced JSON when a base field
  // changes. Re-apply colour fields afterwards so a valid custom HEX is not
  // silently dropped before Generate is pressed.
  ;['name','uid','text','avatar','showAvatar','bg','width','height','scale','replyName','replyText','hasReply'].forEach(id => {
    $(id)?.addEventListener('input', () => setTimeout(syncColorsToJson, 0))
    $(id)?.addEventListener('change', () => setTimeout(syncColorsToJson, 0))
  })

  const syncFieldsFromJson = () => {
    try {
      const payload = JSON.parse($('json').value || '{}')
      for (const [id] of colors) {
        const dropdown = $(`${id}Dropdown`)
        const custom = $(`${id}Custom`)
        if (!dropdown || !custom) continue
        const normalized = String(payload[id] || defaults[id]).trim().toUpperCase()
        const presetName = presetByValue.get(normalized)
        const selected = presetName ? colorPresets[presetName] : 'custom'
        dropdown.dataset.value = selected
        custom.value = presetName ? `${presetName} — ${normalized}` : normalized
        custom.readOnly = selected !== 'custom'
        dropdown.querySelectorAll('.option').forEach(option => option.classList.toggle('active',option.dataset.value === selected))
      }
    } catch (_) {}
  }

  $('applyJson')?.addEventListener('click',() => setTimeout(syncFieldsFromJson,0))
  $('reset')?.addEventListener('click',() => setTimeout(() => {
    for (const [id] of colors) {
      const dropdown = $(`${id}Dropdown`)
      const custom = $(`${id}Custom`)
      if (!dropdown || !custom) continue
      const presetName = presetByValue.get(defaults[id])
      dropdown.dataset.value = presetName ? colorPresets[presetName] : 'custom'
      custom.value = presetName ? `${presetName} — ${defaults[id]}` : defaults[id]
      custom.readOnly = true
      dropdown.querySelectorAll('.option').forEach(option => option.classList.toggle('active', option.dataset.value === dropdown.dataset.value))
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
    .color-trigger { padding:0 5px 0 12px; gap:5px; }
    .color-inline-input { min-width:0; width:100%; height:100%; border:0; outline:0; background:transparent; color:inherit; font:inherit; font-weight:700; }
    .color-inline-input[readonly] { cursor:pointer; }
    .color-menu-toggle { flex:none; display:grid; place-items:center; width:30px; height:30px; border:0; border-radius:6px; background:transparent; color:inherit; cursor:pointer; }
    .color-menu-toggle:hover { background:var(--surface-2); }
    .color-menu-toggle .chevron { pointer-events:none; }
    .dropdown.open .color-menu-toggle .chevron { transform:rotate(225deg) translate(-1px,-1px); }
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
