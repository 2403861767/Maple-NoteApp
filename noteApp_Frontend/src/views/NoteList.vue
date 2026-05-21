<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { queryNotes, deleteNote, uploadNote, exportNote, exportNotePdf, getBatchNoteTags } from '../api/note'
import { getCategoryTree } from '../api/category'
import { ElMessage } from 'element-plus'

const router = useRouter()
const loading = ref(false)
const uploading = ref(false)
const notes = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const categories = ref([])
const noteTagsMap = ref({})
const fileInput = ref(null)
const selectKey = ref(0)
const hoveredId = ref(null)
const clickedId = ref(null)

const searchForm = reactive({ title: '', categoryId: null })

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

const categoryMap = computed(() => {
  const map = {}
  const walk = (list) => {
    for (const item of list) {
      map[item.id] = item.name
      if (item.children?.length) walk(item.children)
    }
  }
  walk(categories.value)
  return map
})

const fetchNotes = async () => {
  loading.value = true
  try {
    const res = await queryNotes({
      title: searchForm.title || undefined,
      categoryId: searchForm.categoryId || undefined,
      pageRequest: { pageNum: currentPage.value, pageSize: pageSize.value },
    })
    notes.value = res.data.noteList || []
    total.value = res.data.total || 0
    if (notes.value.length) {
      const ids = notes.value.map(n => n.id)
      const tagsRes = await getBatchNoteTags(ids)
      noteTagsMap.value = tagsRes.data || {}
    } else {
      noteTagsMap.value = {}
    }
  } finally {
    loading.value = false
  }
}

const fetchCategories = async () => {
  const res = await getCategoryTree()
  categories.value = res.data || []
  selectKey.value++
}

const handleSearch = () => {
  currentPage.value = 1
  fetchNotes()
}

const handleClear = () => handleSearch()

const handlePageChange = (page) => {
  currentPage.value = page
  fetchNotes()
}

const handleDelete = async (id) => {
  try {
    await deleteNote(id)
  } catch {
    return
  }
  fetchNotes()
}

const triggerUpload = () => fileInput.value.click()

const handleFileChange = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  uploading.value = true
  try {
    const res = await uploadNote(file)
    ElMessage.success('上传成功')
    router.push(`/note/detail/${res.data.id}`)
  } catch {
    // axios 拦截器已统一弹窗提示
  } finally {
    uploading.value = false
    e.target.value = ''
  }
}

/* 截取纯文本预览 */
const textPreview = (content) => {
  if (!content) return ''
  return content
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^#{1,6}\s/gm, '')
    .replace(/[*_~`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
}

/* 点击笔记：移动端第一下展开操作，第二下进入详情；桌面端 hover 已展开操作，直接进入 */
function handleNoteClick(id) {
  if (clickedId.value === id) {
    router.push(`/note/detail/${id}`)
  } else {
    clickedId.value = id
  }
}

onMounted(() => {
  fetchNotes()
  fetchCategories()
})
</script>

<template>
  <div class="note-list">
    <!-- Search & Actions bar -->
    <div class="toolbar flat-card">
      <div class="toolbar-left">
        <el-input
          v-model="searchForm.title"
          placeholder="搜索标题或内容..."
          clearable
          size="large"
          class="search-input"
          @keyup.enter="handleSearch"
          @clear="handleClear"
        >
          <template #prefix>
            <el-icon><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg></el-icon>
          </template>
        </el-input>
        <el-select
          v-model="searchForm.categoryId"
          placeholder="全部分类"
          clearable
          size="large"
          style="width: 180px"
          :key="selectKey"
          @change="handleSearch"
        >
          <el-option v-for="c in flatCategories" :key="c.value" :label="c.label" :value="c.value" />
        </el-select>
        <el-button size="large" @click="handleSearch">
          搜索
        </el-button>
      </div>
      <div class="toolbar-right">
        <input ref="fileInput" type="file" accept=".md,.markdown" style="display:none" @change="handleFileChange" />
        <el-button size="large" @click="triggerUpload" :loading="uploading">
          上传 Markdown
        </el-button>
        <el-button type="primary" size="large" @click="router.push('/note/create')">
          <el-icon><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></el-icon>
          新建笔记
        </el-button>
      </div>
    </div>

    <!-- Content -->
    <div class="content-card flat-card">
      <!-- Loading skeleton -->
      <template v-if="loading">
        <div class="skeleton-list">
          <div v-for="i in 6" :key="i" class="skeleton-note-item">
            <div class="skeleton" style="width: 50%; height: 18px" />
            <div class="skeleton" style="width: 80%; height: 14px; margin-top: 8px" />
          </div>
        </div>
      </template>

      <!-- Empty state -->
      <template v-else-if="notes.length === 0">
        <div class="empty-state">
          <svg viewBox="0 0 80 80" width="64" height="64" fill="none" stroke="var(--color-text-muted)" stroke-width="1.5" stroke-linecap="round" opacity="0.5">
            <rect x="12" y="8" width="56" height="64" rx="4" stroke-linejoin="round" />
            <path d="M28 28h24M28 38h24M28 48h16" />
          </svg>
          <span class="empty-title">
            {{ searchForm.title || searchForm.categoryId ? '没有找到匹配的笔记' : '还没有任何笔记' }}
          </span>
          <span class="empty-desc">
            {{ searchForm.title || searchForm.categoryId ? '尝试更换搜索条件' : '点击「新建笔记」开始记录你的第一条思考吧' }}
          </span>
          <el-button v-if="!searchForm.title && !searchForm.categoryId" type="primary" size="large" @click="router.push('/note/create')">
            新建笔记
          </el-button>
        </div>
      </template>

      <!-- Note list -->
      <template v-else>
        <div
          v-for="note in notes" :key="note.id"
          class="note-item"
          :class="{ hovered: hoveredId === note.id || clickedId === note.id }"
          @mouseenter="hoveredId = note.id"
          @mouseleave="hoveredId = null"
        >
          <div
            class="note-main"
            @click="handleNoteClick(note.id)"
          >
            <div class="note-header">
              <h4 class="note-title">{{ note.title }}</h4>
              <span class="note-category" v-if="categoryMap[note.categoryId]">{{ categoryMap[note.categoryId] }}</span>
            </div>
            <p class="note-preview">{{ textPreview(note.content) }}</p>
            <div class="note-meta">
              <span class="note-date">{{ note.updateTime || note.createTime }}</span>
              <span v-if="noteTagsMap[note.id]?.length" class="note-tags">
                <span v-for="t in noteTagsMap[note.id]" :key="t.id" class="note-tag">{{ t.name }}</span>
              </span>
            </div>
          </div>
          <div class="note-actions" v-show="hoveredId === note.id || clickedId === note.id">
            <el-button text type="primary" size="small" @click.stop="router.push(`/note/edit/${note.id}`)">编辑</el-button>
            <el-button text size="small" @click.stop="exportNote(note.id, note.title)">导出MD</el-button>
            <el-button text size="small" @click.stop="exportNotePdf(note.id, note.title)">导出PDF</el-button>
            <el-popconfirm title="确认删除？" @confirm="handleDelete(note.id)">
              <template #reference>
                <el-button text type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </div>
        </div>

        <div class="pagination-wrap" v-if="total > pageSize">
          <el-pagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            :total="total"
            layout="total, prev, pager, next"
            @current-change="handlePageChange"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.note-list {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  gap: 16px;
  flex-wrap: wrap;
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.search-input { width: 260px; }
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Content card */
.content-card {
  padding: 0;
  overflow: hidden;
}

/* Skeleton */
.skeleton-list {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.skeleton-note-item {
  display: flex;
  flex-direction: column;
}

/* Note item */
.note-item {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--color-border-light);
  border-left: 3px solid transparent;
  transition: border-left-color var(--transition-fast), background var(--transition-fast);
}
.note-item:last-child {
  border-bottom: none;
}
.note-item.hovered {
  border-left-color: var(--color-primary);
  background: var(--color-primary-50);
}
.note-main {
  flex: 1;
  padding: 16px 20px 16px 17px;
  cursor: pointer;
  min-width: 0;
}
.note-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 4px;
}
.note-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.note-category {
  font-size: 12px;
  color: var(--color-text-muted);
  white-space: nowrap;
  flex-shrink: 0;
}
.note-preview {
  font-size: 13px;
  color: var(--color-text-muted);
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 6px;
}
.note-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}
.note-date {
  font-size: 12px;
  color: var(--color-text-muted);
}
.note-tags {
  display: flex;
  gap: 6px;
}
.note-tag {
  font-size: 11px;
  color: var(--color-primary);
  background: var(--color-primary-50);
  padding: 1px 8px;
  border-radius: 10px;
}

/* Actions — slide in on hover */
.note-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 16px 0 8px;
  flex-shrink: 0;
  animation: actions-in var(--transition-fast) ease;
}
@keyframes actions-in {
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  padding: 20px;
}
</style>
