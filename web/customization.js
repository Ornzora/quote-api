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
  const validColor = (v) => /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(v).trim())

  const makeOption = (name, value) => {
    const o = document.createElement('button')
    o.type = 'button'
    o.className = 'option'
    o.dataset.value = value
    o.setAttribute('role','option')
    o.textContent = `${name} — ${value.toUpperCase()}`
    return o
  }

  const createColorField = ([id, label]) => {
    const field = $(`${id}Field`)
    if (!field) return null
    const dropdown = field.querySelector('.dropdown')
    // FIX 1: was `let trigger` then immediately `const trigger` (duplicate declaration → SyntaxError)
    let trigger = dropdown?.querySelector('.dropdown-trigger')
    const menu = dropdown?.querySelector('.menu')
    const labelEl = field.querySelector('.label')
    if (!dropdown || !trigger || !menu) return null
    if (labelEl) labelEl.textContent = label

    dropdown.dataset.select = id
    dropdown.id = `${id}Dropdown`
    menu.innerHTML = ''
    Object.entries(colorPresets).forEach(([n, v]) => menu.appendChild(makeOption(n, v)))
    menu.appendChild(makeOption('Custom HEX', 'custom'))

    const input = document.createElement('input')
    input.className = 'color-inline-input'
    input.id = `${id}Custom`
    input.type = 'text'
    input.maxLength = 7
    input.spellcheck = false
    input.inputMode = 'text'
    input.placeholder = '#FFFFFF'
    input.setAttribute('aria-label', `${label} custom HEX`)
    input.readOnly = true

    const menuToggle = document.createElement('button')
    menuToggle.className = 'color-menu-toggle'
    menuToggle.type = 'button'
    menuToggle.setAttribute('aria-label', `Choose ${label.toLowerCase()}`)
    menuToggle.setAttribute('aria-haspopup', 'listbox')
    menuToggle.setAttribute('aria-expanded', 'false')
    menuToggle.innerHTML = '<span class="chevron" aria-hidden="true"></span>'

    // Replace the original <button> trigger with a <div> container
    const colorTrigger = document.createElement('div')
    colorTrigger.className = `${trigger.className} color-trigger`
    trigger.replaceWith(colorTrigger)
    trigger = colorTrigger  // reassign — valid because trigger is `let` (FIX 1)
    trigger.replaceChildren(input, menuToggle)

    const setValue = (value) => {
      const norm = String(value || defaults[id]).trim().toUpperCase()
      const presetName = presetByValue.get(norm)
      const selected = presetName ? colorPresets[presetName] : 'custom'
      dropdown.dataset.value = selected
      input.value = presetName ? `${presetName} — ${norm}` : norm
      input.readOnly = selected !== 'custom'
      menu.querySelectorAll('.option').forEach(o => o.classList.toggle('active', o.dataset.value === selected))
    }

    const selectCustom = () => {
      const cur = dropdown.dataset.value === 'custom' ? input.value : dropdown.dataset.value
      dropdown.dataset.value = 'custom'
      input.value = validColor(cur) ? cur.trim().toUpperCase() : defaults[id]
      input.readOnly = false
      menu.querySelectorAll('.option').forEach(o => o.classList.toggle('active', o.dataset.value === 'custom'))
      requestAnimationFrame(() => input.focus())
    }

    const closeOthers = () => {
      document.querySelectorAll('.dropdown.open').forEach(other => {
        if (other !== dropdown) {
          other.classList.remove('open')
          other.querySelectorAll('[aria-expanded]').forEach(c => c.setAttribute('aria-expanded','false'))
        }
      })
    }

    // FIX 2: was missing closing `)` for addEventListener — was `}` instead of `})`
    // FIX 3: `toggleMenu` referenced undefined `triggerText` — replaced with clean `toggleThis`
    const toggleThis = (e) => {
      e.stopPropagation()
      closeOthers()
      const open = dropdown.classList.toggle('open')
      menuToggle.setAttribute('aria-expanded', String(open))
    }

    // Clicking the container row opens/closes the menu
    trigger.addEventListener('click', toggleThis)

    // Clicking the text input:
    //   • if editable → stay in edit mode (stop bubble so menu doesn't toggle)
    //   • if readonly  → let event bubble up to trigger, which calls toggleThis
    input.addEventListener('click', (e) => {
      if (!input.readOnly) e.stopPropagation()
    })

    // Clicking the chevron button also toggles the menu; stop bubble to avoid
    // double-firing the trigger's listener
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation()
      toggleThis(e)
    })

    menu.querySelectorAll('.option').forEach(o => o.addEventListener('click', (e) => {
      e.stopPropagation()
      if (o.dataset.value === 'custom') selectCustom()
      else setValue(o.dataset.value)
      dropdown.classList.remove('open')
      menuToggle.setAttribute('aria-expanded', 'false')
      syncColorsToJson()
    }))

    input.addEventListener('input', syncColorsToJson)
    input.addEventListener('change', syncColorsToJson)
    setValue(defaults[id])
    return field
  }

  const syncColorsToJson = () => {
    const json = $('json')
    if (!json) return
    try {
      const payload = JSON.parse(json.value || '{}')
      for (const [id] of colors) {
        const dd = $(`${id}Dropdown`)
        const inp = $(`${id}Custom`)
        const val = dd?.dataset.value === 'custom' ? inp?.value.trim() : dd?.dataset.value
        if (validColor(val)) payload[id] = val.toUpperCase()
      }
      json.value = JSON.stringify(payload, null, 2)
    } catch (_) {}
  }

  const [f1, f2, f3] = colors.map(createColorField)
  if (!f1 || !f2 || !f3) return

  // FIX 4: this listener block was duplicated — keeping only one copy
  ;['name','uid','text','avatar','showAvatar','bg','width','height','scale','replyName','replyText','hasReply'].forEach(id => {
    $(id)?.addEventListener('input', () => setTimeout(syncColorsToJson, 0))
    $(id)?.addEventListener('change', () => setTimeout(syncColorsToJson, 0))
  })

  const syncFieldsFromJson = () => {
    try {
      const payload = JSON.parse($('json').value || '{}')
      for (const [id] of colors) {
        const dd = $(`${id}Dropdown`)
        const inp = $(`${id}Custom`)
        if (!dd || !inp) continue
        const norm = String(payload[id] || defaults[id]).trim().toUpperCase()
        const presetName = presetByValue.get(norm)
        const selected = presetName ? colorPresets[presetName] : 'custom'
        dd.dataset.value = selected
        inp.value = presetName ? `${presetName} — ${norm}` : norm
        inp.readOnly = selected !== 'custom'
        dd.querySelectorAll('.option').forEach(o => o.classList.toggle('active', o.dataset.value === selected))
      }
    } catch (_) {}
  }

  $('applyJson')?.addEventListener('click', () => setTimeout(syncFieldsFromJson, 0))
  $('reset')?.addEventListener('click', () => setTimeout(() => {
    for (const [id] of colors) {
      const dd = $(`${id}Dropdown`)
      const inp = $(`${id}Custom`)
      if (!dd || !inp) continue
      const norm = defaults[id].toUpperCase()
      const presetName = presetByValue.get(norm)
      const selected = presetName ? colorPresets[presetName] : defaults[id]
      dd.dataset.value = selected
      inp.value = presetName ? `${presetName} — ${norm}` : defaults[id]
      inp.readOnly = true
      dd.querySelectorAll('.option').forEach(o => o.classList.toggle('active', o.dataset.value === selected))
    }
    syncColorsToJson()
  }, 0))

  const tbody = document.querySelector('#request-doc table tbody')
  if (tbody) for (const [id, label] of colors) {
    const tr = document.createElement('tr')
    tr.innerHTML = `<td><code>${id}</code></td><td>string</td><td>${label} as a hex color (<code>#RGB</code> or <code>#RRGGBB</code>). Defaults to <code>${defaults[id]}</code>.</td>`
    tbody.appendChild(tr)
  }

  const qs = document.querySelector('#quickstart .code')
  if (qs && !qs.textContent.includes('bubbleColor')) {
    qs.textContent = qs.textContent.replace(/\n  ]\n}/, '\n  ],\n  "bubbleColor": "#FFFFFF",\n  "nameColor": "#000000",\n  "textColor": "#000000"\n}')
  }

  const style = document.createElement('style')
  style.id = 'quotely-customization-styles'
  style.textContent = `
    .color-trigger { padding: 0 5px 0 12px; gap: 5px; }
    .color-inline-input { min-width: 0; width: 100%; height: 100%; border: 0; outline: 0; background: transparent; color: inherit; font: inherit; font-weight: 700; }
    .color-inline-input[readonly] { cursor: pointer; }
    .color-menu-toggle { flex: none; display: grid; place-items: center; width: 30px; height: 30px; border: 0; border-radius: 6px; background: transparent; color: inherit; cursor: pointer; }
    .color-menu-toggle:hover { background: var(--surface-2); }
    .color-menu-toggle .chevron { pointer-events: none; }
    .dropdown.open .color-menu-toggle .chevron { transform: rotate(225deg) translate(-1px,-1px); }
  `
  document.head.appendChild(style)

  const resultImg = $('resultImage')
  if (resultImg) {
    let prevUrl = null
    new MutationObserver(() => {
      if (prevUrl && prevUrl !== resultImg.src) URL.revokeObjectURL(prevUrl)
      prevUrl = resultImg.src
    }).observe(resultImg, { attributes: true, attributeFilter: ['src'] })
  }

  syncColorsToJson()
})()
