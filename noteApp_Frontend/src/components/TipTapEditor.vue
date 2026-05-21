<script setup>
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '开始书写...' },
})

const emit = defineEmits(['update:modelValue'])

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      codeBlock: { HTMLAttributes: { class: 'language-plaintext' } },
    }),
    Image.configure({ allowBase64: false }),
    Placeholder.configure({ placeholder: props.placeholder }),
    Link.configure({ openOnClick: false }),
    Underline,
  ],
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  },
})

function setContent(html) {
  if (!editor.value || html === editor.value.getHTML()) return
  editor.value.commands.setContent(html)
}

defineExpose({ editor, setContent })
</script>

<template>
  <div class="tiptap-wrapper">
    <div v-if="editor" class="tiptap-editor">
      <EditorContent :editor="editor" />
    </div>
  </div>
</template>

<style>
.tiptap-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.tiptap-editor {
  flex: 1;
  overflow-y: auto;
}
.tiptap-editor .ProseMirror {
  min-height: 100%;
  padding: 20px;
  font-family: var(--font-family);
  font-size: 14px;
  line-height: 1.8;
  color: var(--color-text);
  outline: none;
  word-break: break-word;
}
.tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: var(--color-text-muted);
  pointer-events: none;
  height: 0;
}
.tiptap-editor .ProseMirror h1 { font-size: 1.6em; margin: 0.8em 0 0.5em; }
.tiptap-editor .ProseMirror h2 { font-size: 1.4em; margin: 0.8em 0 0.4em; }
.tiptap-editor .ProseMirror h3 { font-size: 1.2em; margin: 0.7em 0 0.3em; }
.tiptap-editor .ProseMirror p { margin: 0.5em 0; }
.tiptap-editor .ProseMirror ul,
.tiptap-editor .ProseMirror ol { padding-left: 2em; margin: 0.5em 0; }
.tiptap-editor .ProseMirror li { margin: 0.2em 0; }
.tiptap-editor .ProseMirror blockquote {
  margin: 0.6em 0;
  padding: 8px 16px;
  border-left: 4px solid var(--color-primary-light);
  background: var(--color-primary-50);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  color: var(--color-text-secondary);
}
.tiptap-editor .ProseMirror code {
  padding: 2px 6px;
  background: var(--color-primary-50);
  border-radius: 3px;
  font-family: var(--font-mono);
  font-size: 0.9em;
  color: #E74C3C;
}
.tiptap-editor .ProseMirror pre {
  margin: 0.6em 0;
  padding: 16px;
  background: #282C34;
  border-radius: var(--radius-md);
  overflow-x: auto;
}
.tiptap-editor .ProseMirror pre code {
  padding: 0;
  background: transparent;
  font-size: 0.875em;
  line-height: 1.6;
  color: #ABB2BF;
}
.tiptap-editor .ProseMirror img {
  max-width: 100%;
  border-radius: var(--radius-sm);
  cursor: default;
}
.tiptap-editor .ProseMirror a {
  color: var(--color-primary);
  text-decoration: underline;
}
.tiptap-editor .ProseMirror table { border-collapse: collapse; margin: 1em 0; width: 100%; }
.tiptap-editor .ProseMirror th,
.tiptap-editor .ProseMirror td {
  border: 1px solid var(--color-border-light);
  padding: 8px 12px;
  text-align: left;
}
.tiptap-editor .ProseMirror th {
  background: var(--color-primary-50);
  font-weight: 600;
}

/* Dark mode */
html.dark .tiptap-editor .ProseMirror blockquote {
  background: #1E293B;
  color: #999999;
}
html.dark .tiptap-editor .ProseMirror code {
  background: #334155;
  color: #F87171;
}
html.dark .tiptap-editor .ProseMirror pre {
  background: #0F172A;
  border: 1px solid #334155;
}
html.dark .tiptap-editor .ProseMirror th {
  background: #1E293B;
}
</style>
