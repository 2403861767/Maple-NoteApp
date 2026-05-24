import { ref, onBeforeUnmount, getCurrentInstance } from 'vue'

// ---- Singleton state ----
let listenerAdded = false
const handlers = new Map()
const registry = ref([])
const helpVisible = ref(false)
const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
let nextId = 0

// ---- Helpers ----

function eventToCanonical(event) {
  const parts = []
  if (event.metaKey || event.ctrlKey) parts.push('Mod')
  if (event.altKey) parts.push('Alt')

  // Include Shift when key is a letter or a navigation/function key (>1 char),
  // but NOT for symbols like ? ! @ # — Shift is already baked into those chars
  const isLetter = event.key.length === 1 && /[a-zA-Z]/.test(event.key)
  if (event.shiftKey && (event.key.length > 1 || isLetter)) {
    parts.push('Shift')
  }

  let key = event.key
  if (key.length === 1) key = key.toUpperCase()
  parts.push(key)

  return parts.join('+')
}

function isEditingElement(el) {
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  if (['input', 'textarea', 'select'].includes(tag)) return true
  if (el.isContentEditable) return true
  return false
}

function handleKeydown(event) {
  // TipTap / ProseMirror already consumed this event
  if (event.defaultPrevented) return
  // IME composition (e.g. Chinese input)
  if (event.isComposing) return

  const canonical = eventToCanonical(event)
  const list = handlers.get(canonical)
  if (!list || list.length === 0) return

  const entry = list[list.length - 1]

  // Single-key shortcuts: skip when user is typing in an input/editor
  if (!event.metaKey && !event.ctrlKey && !event.altKey) {
    if (isEditingElement(document.activeElement)) return
  }

  event.preventDefault()
  event.stopPropagation()
  entry.handler(event)
}

function ensureListener() {
  if (!listenerAdded) {
    window.addEventListener('keydown', handleKeydown, true)
    listenerAdded = true
  }
}

// ---- Display helper ----

export function displayShortcut(raw, mac) {
  return raw
    .split('+')
    .map((p) => {
      const t = p.trim()
      if (t === 'Mod') return mac ? '⌘' : 'Ctrl'
      if (t === 'Shift') return mac ? '⇧' : 'Shift'
      if (t === 'Alt') return mac ? '⌥' : 'Alt'
      if (t === 'Escape') return 'Esc'
      if (t === 'Backspace') return mac ? '⌫' : 'Backspace'
      return t
    })
    .join(mac ? ' ' : ' + ')
}

// ---- Normalize shortcut string to canonical form ----
function normalizeShortcut(raw) {
  return raw.split('+').map((p) => {
    const t = p.trim()
    // Single letters → uppercase; everything else (Mod, Shift, Alt, Escape, /, ?, etc.) as-is
    if (t.length === 1 && /[a-zA-Z]/.test(t)) return t.toUpperCase()
    return t
  }).join('+')
}

// ---- Composable ----

export function useShortcuts() {
  const instance = getCurrentInstance()
  const cid = nextId++
  const localKeys = []

  ensureListener()

  function register(shortcut, handler, opts = {}) {
    const key = normalizeShortcut(shortcut)
    if (!handlers.has(key)) {
      handlers.set(key, [])
    }
    handlers.get(key).push({ handler, cid })

    registry.value.push({
      shortcut: key,
      description: opts.description || '',
      category: opts.category || '',
      cid,
    })
    localKeys.push(key)
  }

  if (instance) {
    onBeforeUnmount(() => {
      for (const key of localKeys) {
        const list = handlers.get(key)
        if (!list) continue
        const idx = list.findIndex((e) => e.cid === cid)
        if (idx !== -1) list.splice(idx, 1)
        if (list.length === 0) handlers.delete(key)
      }
      registry.value = registry.value.filter((e) => e.cid !== cid)
    })
  }

  return { register, helpVisible, shortcutRegistry: registry, isMac }
}
