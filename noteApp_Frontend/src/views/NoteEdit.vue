<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createNote, getNoteDetail, updateNote, getNoteTags, setNoteTags, uploadNoteImage } from '../api/note'
import { getCategoryTree } from '../api/category'
import { getTagList } from '../api/tag'
import { markdownToHtml, htmlToMarkdown } from '../composables/useMarkdownConverter'
import { useShortcuts } from '../composables/useShortcuts'
import TipTapEditor from '../components/TipTapEditor.vue'
import { ElMessage } from 'element-plus'

const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp']

const route = useRoute()
const router = useRouter()
const isEdit = computed(() => !!route.params.id)
const loading = ref(false)
const categories = ref([])
const allTags = ref([])
const selectedTagIds = ref([])
const previewVisible = ref(true)
const mobileViewMode = ref('edit')
const imageInput = ref(null)
const imageUploading = ref(false)
const editorRef = ref(null)

const mobileMedia = window.matchMedia('(max-width: 768px)')
const isMobile = ref(mobileMedia.matches)
function onMobileChange(e) { isMobile.value = e.matches }
mobileMedia.addEventListener('change', onMobileChange)

const form = reactive({ title: '', content: '', categoryId: null })
const editorHtml = ref('')

const flatCategories = computed(() => {
  const walk = (list, prefix = '') => {
    let result = []
    for (const item of list) {
      result.push({ value: item.id, label: prefix + item.name })
      if (item.children?.length) {
        result = result.concat(walk(item.children, prefix + '  '))
      }
    }
    return result
  }
  return walk(categories.value)
})

const previewHtml = computed(() => markdownToHtml(form.content))

// Tiptap -> Markdown sync
watch(editorHtml, (val) => {
  form.content = htmlToMarkdown(val)
})

// ---- Toolbar commands ----
function exec(cmd) { return () => editorRef.value?.editor?.chain().focus()[cmd]().run() }
function execHeading(lv) { return () => editorRef.value?.editor?.chain().focus().toggleHeading({ level: lv }).run() }
const doBold = exec('toggleBold')
const doItalic = exec('toggleItalic')
const doCode = exec('toggleCode')
const doCodeBlock = exec('toggleCodeBlock')
const doBlockquote = exec('toggleBlockquote')
const doBulletList = exec('toggleBulletList')
const doOrderedList = exec('toggleOrderedList')
const doH1 = execHeading(1)
const doH2 = execHeading(2)
const doH3 = execHeading(3)
const doUndo = exec('undo')
const doRedo = exec('redo')
// ---- Link input state ----
const showLinkInput = ref(false)
const linkUrl = ref('')
const linkText = ref('')
const linkInputRef = ref(null)

async function openLinkInput() {
  const editor = editorRef.value?.editor
  if (!editor) return
  const { from, to, empty } = editor.state.selection
  if (!empty) {
    linkText.value = editor.state.doc.textBetween(from, to)
  } else {
    linkText.value = ''
  }
  linkUrl.value = ''
  showLinkInput.value = true
  await nextTick()
  linkInputRef.value?.focus()
}

function confirmLink() {
  const editor = editorRef.value?.editor
  if (!editor || !linkUrl.value.trim()) return
  const url = /^https?:\/\//i.test(linkUrl.value) ? linkUrl.value : 'https://' + linkUrl.value
  const { empty, from, to } = editor.state.selection
  const selectedText = empty ? '' : editor.state.doc.textBetween(from, to)

  if (!empty && linkText.value === selectedText) {
    editor.chain().focus().setLink({ href: url }).run()
  } else {
    const text = linkText.value.trim() || linkUrl.value
    editor.chain().focus().deleteSelection().insertContent(`<a href="${url}">${text}</a>`).run()
  }
  showLinkInput.value = false
}

function cancelLink() {
  showLinkInput.value = false
}

function triggerImage() { imageInput.value?.click() }

async function handleImageUpload(e) {
  const file = e.target.files?.[0]
  if (!file) return

  // MIME 校验 + 后缀兜底（Windows 可能报告 image/jpg 或空 type）
  const ext = file.name?.split('.').pop()?.toLowerCase()
  const mimeOk = ALLOWED_MIME.includes(file.type)
  const extOk = ext && ALLOWED_EXT.includes(ext)
  if (!mimeOk && !extOk) {
    ElMessage.error('仅支持 JPG、PNG、GIF、WebP 格式')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过 5MB')
    return
  }

  imageUploading.value = true
  try {
    const res = await uploadNoteImage(file)
    editorRef.value?.editor?.chain().focus().setImage({ src: res.data.url }).run()
  } catch {
    // axios 拦截器已统一弹窗提示
  } finally {
    imageUploading.value = false
    e.target.value = ''
  }
}

const toolbarButtons = [
  { label: '撤销', icon: '↶', action: doUndo },
  { label: '重做', icon: '↷', action: doRedo },
  { type: 'sep' },
  { label: '标题1', icon: 'H1', action: doH1 },
  { label: '标题2', icon: 'H2', action: doH2 },
  { label: '标题3', icon: 'H3', action: doH3 },
  { type: 'sep' },
  { label: '加粗', icon: 'B', action: doBold },
  { label: '斜体', icon: 'I', action: doItalic },
  { label: '行内代码', icon: '`', action: doCode },
  { label: '代码块', icon: '{}', action: doCodeBlock },
  { label: '引用', icon: '"', action: doBlockquote },
  { type: 'sep' },
  { label: '无序列表', icon: '•', action: doBulletList },
  { label: '有序列表', icon: '1.', action: doOrderedList },
  { label: '链接', icon: '🔗', action: openLinkInput },
  { label: '图片', icon: '🖼', action: triggerImage },
]

const fetchCategories = async () => {
  const res = await getCategoryTree()
  categories.value = res.data || []
}

const fetchTags = async () => {
  const res = await getTagList()
  allTags.value = res.data || []
}

const fetchNote = async () => {
  if (!isEdit.value) return
  loading.value = true
  try {
    const [noteRes, tagsRes] = await Promise.all([
      getNoteDetail(route.params.id),
      getNoteTags(route.params.id)
    ])
    form.title = noteRes.data.title
    form.content = noteRes.data.content
    form.categoryId = noteRes.data.categoryId
    const html = markdownToHtml(noteRes.data.content || '')
    editorHtml.value = html
    // 同步 TipTap 编辑器内容（useEditor 只在挂载时读一次 content prop）
    editorRef.value?.setContent(html)
    selectedTagIds.value = (tagsRes.data || []).map(t => t.id)
  } finally {
    loading.value = false
  }
}

const handleSave = async () => {
  if (!form.title.trim()) {
    ElMessage.warning('请输入笔记标题')
    return
  }
  loading.value = true
  try {
    let noteId
    if (isEdit.value) {
      const res = await updateNote({ id: Number(route.params.id), ...form })
      noteId = res.data.id
    } else {
      const res = await createNote(form)
      noteId = res.data.id
    }
    await setNoteTags(noteId, selectedTagIds.value)
    router.push('/notes')
  } finally {
    loading.value = false
  }
}

const toggleTag = (tagId) => {
  const idx = selectedTagIds.value.indexOf(tagId)
  if (idx >= 0) selectedTagIds.value.splice(idx, 1)
  else selectedTagIds.value.push(tagId)
}

// ---- Keyboard shortcuts ----
const { register } = useShortcuts()
register('Mod+s', handleSave, { description: '保存笔记', category: '编辑器' })
register('Mod+p', () => { previewVisible.value = !previewVisible.value }, { description: '切换预览', category: '编辑器' })
register('Mod+Shift+i', triggerImage, { description: '插入图片', category: '编辑器' })
register('Mod+k', openLinkInput, { description: '插入链接', category: '编辑器' })

onMounted(() => {
  fetchCategories()
  fetchTags()
  fetchNote()
})

onBeforeUnmount(() => {
  mobileMedia.removeEventListener('change', onMobileChange)
})
</script>

<template>
  <div class="note-edit">
    <!-- Header -->
    <div class="edit-toolbar flat-card">
      <h3 class="edit-title">{{ isEdit ? '编辑笔记' : '新建笔记' }}</h3>
      <div class="edit-actions">
        <el-button text @click="previewVisible = !previewVisible" class="preview-toggle">
          {{ previewVisible ? '收起预览' : '展开预览' }}
        </el-button>
        <el-button @click="router.push('/notes')">取 消</el-button>
        <el-button type="primary" :loading="loading" @click="handleSave">保 存</el-button>
      </div>
    </div>

    <!-- Form -->
    <div class="edit-body">
      <!-- Meta row -->
      <div class="meta-row flat-card">
        <div class="meta-field">
          <label class="field-label">标题</label>
          <el-input v-model="form.title" placeholder="输入笔记标题..." size="large" class="title-input" />
        </div>
        <div class="meta-field">
          <label class="field-label">分类</label>
          <el-select v-model="form.categoryId" placeholder="选择分类" clearable size="large" style="width: 200px">
            <el-option v-for="c in flatCategories" :key="c.value" :label="c.label" :value="c.value" />
          </el-select>
        </div>
      </div>

      <!-- Hidden image input -->
      <input ref="imageInput" type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp" style="display:none" @change="handleImageUpload" />

      <!-- Tags -->
      <div class="tags-row flat-card" v-if="allTags.length">
        <label class="field-label">标签</label>
        <div class="tag-chips">
          <button
            v-for="tag in allTags" :key="tag.id" class="tag-chip"
            :class="{ active: selectedTagIds.includes(tag.id) }"
            @click="toggleTag(tag.id)" type="button"
          >{{ tag.name }}</button>
        </div>
      </div>

      <!-- Editor area -->
      <div class="editor-area flat-card">
        <!-- Tiptap toolbar -->
        <div class="md-toolbar">
          <template v-for="btn in toolbarButtons" :key="btn.label || btn.type">
            <span v-if="btn.type === 'sep'" class="toolbar-sep" />
            <el-tooltip v-else :content="btn.label" placement="top" :show-after="400">
              <button class="md-toolbar-btn" :aria-label="btn.label" @click="btn.action" type="button">
                {{ btn.icon }}
              </button>
            </el-tooltip>
          </template>
        </div>

        <!-- Inline link input -->
        <div class="link-input-bar" v-if="showLinkInput">
          <div class="link-input-row">
            <input
              ref="linkInputRef"
              v-model="linkUrl"
              placeholder="输入链接地址 https://..."
              class="link-url-input"
              @keyup.enter="confirmLink"
              @keyup.escape="cancelLink"
            />
            <input
              v-model="linkText"
              placeholder="显示文本（可选）"
              class="link-text-input"
              @keyup.enter="confirmLink"
              @keyup.escape="cancelLink"
            />
            <button class="link-confirm-btn" @click="confirmLink" type="button">确认</button>
            <button class="link-cancel-btn" @click="cancelLink" type="button">取消</button>
          </div>
        </div>

        <!-- Split pane -->
        <div class="md-split" :class="{ 'hide-preview': !previewVisible }">
          <div class="md-editor-pane" v-show="isMobile ? mobileViewMode === 'edit' : true">
            <TipTapEditor
              ref="editorRef"
              v-model="editorHtml"
              placeholder="开始书写..."
            />
          </div>
          <div class="md-preview-pane" v-show="isMobile ? mobileViewMode === 'preview' : previewVisible">
            <div class="md-preview markdown-body" v-html="previewHtml" />
          </div>
        </div>

        <!-- Mobile: editor/preview tabs -->
        <div class="mobile-editor-tabs">
          <button
            class="mobile-tab"
            :class="{ active: mobileViewMode === 'edit' }"
            @click="mobileViewMode = 'edit'"
            type="button"
          >编辑</button>
          <button
            class="mobile-tab"
            :class="{ active: mobileViewMode === 'preview' }"
            @click="mobileViewMode = 'preview'"
            type="button"
          >预览</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.note-edit {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Header toolbar */
.edit-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
}
.edit-title { font-size: 18px; font-weight: 600; }
.edit-actions { display: flex; align-items: center; gap: 8px; }
.preview-toggle { color: var(--color-text-muted); }

/* Body */
.edit-body { display: flex; flex-direction: column; gap: 12px; }

/* Meta row */
.meta-row {
  display: flex;
  align-items: flex-end;
  gap: 24px;
  padding: 16px 24px;
  flex-wrap: wrap;
}
.meta-field { display: flex; flex-direction: column; gap: 6px; }
.title-input { width: 360px; }

.field-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Tags */
.tags-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 24px;
}
.tag-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.tag-chip {
  padding: 6px 16px;
  border-radius: 20px;
  border: 1.5px solid var(--color-border);
  background: var(--color-bg-white);
  color: var(--color-text-secondary);
  font-size: 13px;
  font-family: var(--font-family);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.tag-chip:hover { border-color: var(--color-primary-light); color: var(--color-primary); }
.tag-chip.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-on-primary);
  font-weight: 500;
}

/* Editor area */
.editor-area {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Toolbar */
.md-toolbar {
  display: flex;
  gap: 2px;
  align-items: center;
  flex-wrap: wrap;
  padding: 6px 12px;
  background: var(--color-bg-gray);
  border-bottom: 1px solid var(--color-border-light);
}
.md-toolbar-btn {
  width: 34px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  font-family: var(--font-mono);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}
.md-toolbar-btn:hover { background: var(--color-border-light); color: var(--color-primary); }
.toolbar-sep {
  width: 1px;
  height: 20px;
  background: var(--color-border);
  margin: 0 4px;
}

/* Inline link input */
.link-input-bar {
  padding: 8px 16px;
  background: var(--color-bg-gray);
  border-bottom: 1px solid var(--color-border-light);
}
.link-input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.link-url-input,
.link-text-input {
  padding: 6px 10px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-family: var(--font-family);
  outline: none;
  transition: border-color var(--transition-fast);
}
.link-url-input:focus,
.link-text-input:focus {
  border-color: var(--color-primary);
}
.link-url-input {
  flex: 1;
  min-width: 200px;
}
.link-text-input {
  width: 180px;
}
.link-confirm-btn,
.link-cancel-btn {
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-family: var(--font-family);
  cursor: pointer;
  border: none;
  transition: background var(--transition-fast);
}
.link-confirm-btn {
  background: var(--color-primary);
  color: var(--color-on-primary);
}
.link-confirm-btn:hover { background: var(--color-primary-dark); }
.link-cancel-btn {
  background: var(--color-border-light);
  color: var(--color-text-secondary);
}
.link-cancel-btn:hover { background: var(--color-border); }

/* Split panes */
.md-split {
  display: flex;
  min-height: 520px;
  height: calc(100vh - 360px);
}
.md-split.hide-preview .md-editor-pane { flex: 1; }
.md-editor-pane {
  flex: 1;
  min-width: 0;
  display: flex;
  background: var(--color-bg-white);
}
.md-preview-pane {
  flex: 1;
  border-left: 1px solid var(--color-border-light);
  overflow-y: auto;
  min-width: 0;
  background: var(--color-bg-white);
}

/* Preview */
.md-preview {
  padding: 20px 24px;
  font-size: 14px;
  line-height: 1.8;
  color: var(--color-text);
  word-break: break-word;
}

/* ---- Mobile editor tabs (hidden on desktop) ---- */
.mobile-editor-tabs {
  display: none;
  border-top: 1px solid var(--color-border-light);
  background: var(--color-bg-white);
}
.mobile-tab {
  flex: 1;
  padding: 12px;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  font-family: var(--font-family);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: color var(--transition-fast), border-bottom-color var(--transition-fast);
  border-bottom: 2px solid transparent;
}
.mobile-tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
  font-weight: 600;
}

/* ======================================== */
/* ===== Mobile: max-width 768px ===== */
/* ======================================== */
@media (max-width: 768px) {
  .edit-toolbar {
    padding: 12px 16px;
  }
  .edit-title {
    font-size: 16px;
  }
  .edit-actions {
    gap: 4px;
  }
  /* Hide desktop preview toggle on mobile */
  .preview-toggle {
    display: none;
  }

  /* Meta row stacks */
  .meta-row {
    flex-direction: column;
    gap: 12px;
    padding: 12px 16px;
  }
  .title-input {
    width: 100%;
  }
  .meta-field .el-select {
    width: 100% !important;
  }

  /* Tags row */
  .tags-row {
    padding: 12px 16px;
    flex-direction: column;
    gap: 8px;
  }

  /* Toolbar wraps */
  .md-toolbar {
    padding: 4px 8px;
    gap: 0;
  }
  .md-toolbar-btn {
    width: 30px;
    height: 28px;
    font-size: 12px;
  }

  /* Link input bar */
  .link-input-row {
    flex-wrap: wrap;
  }
  .link-url-input {
    flex: 1 1 100%;
    min-width: 0;
  }
  .link-text-input {
    flex: 1 1 calc(50% - 4px);
    width: auto;
  }

  /* Split pane — stacked vertically */
  .md-split {
    flex-direction: column;
    min-height: 0;
    height: auto;
  }
  .md-split.hide-preview .md-editor-pane {
    flex: auto;
  }
  .md-editor-pane {
    min-height: 300px;
  }
  .md-preview-pane {
    border-left: none;
    border-top: 1px solid var(--color-border-light);
    min-height: 300px;
    max-height: none;
  }

  /* Show mobile tabs */
  .mobile-editor-tabs {
    display: flex;
  }
}
</style>
