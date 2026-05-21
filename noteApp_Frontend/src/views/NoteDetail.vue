<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getNoteDetail, getNoteTags, exportNote, exportNotePdf } from '../api/note'
import { getCategoryTree } from '../api/category'
import { renderMarkdown } from '../utils/md'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const note = ref(null)
const tags = ref([])
const categories = ref([])

const categoryName = computed(() => {
  if (!note.value?.categoryId) return ''
  const walk = (list) => {
    for (const item of list) {
      if (item.id === note.value.categoryId) return item.name
      if (item.children?.length) {
        const found = walk(item.children)
        if (found) return found
      }
    }
    return ''
  }
  return walk(categories.value)
})

onMounted(async () => {
  loading.value = true
  try {
    const [noteRes, tagsRes, catRes] = await Promise.all([
      getNoteDetail(route.params.id),
      getNoteTags(route.params.id),
      getCategoryTree()
    ])
    note.value = noteRes.data
    tags.value = tagsRes.data || []
    categories.value = catRes.data || []
  } finally {
    loading.value = false
  }
})

const skeletonWidths = Array.from({ length: 12 }, () => `${60 + Math.random() * 40}%`)
const contentHtml = computed(() => renderMarkdown(note.value?.content || ''))
</script>

<template>
  <div class="note-detail">
    <!-- Loading skeleton -->
    <template v-if="loading">
      <div class="detail-skeleton flat-card">
        <div class="skeleton-header">
          <div class="skeleton" style="width: 320px; height: 28px" />
          <div class="skeleton" style="width: 200px; height: 36px" />
        </div>
        <div class="skeleton-meta">
          <div class="skeleton" style="width: 180px; height: 16px" />
          <div class="skeleton" style="width: 140px; height: 16px" />
          <div class="skeleton" style="width: 140px; height: 16px" />
        </div>
        <div class="skeleton-content">
          <div v-for="(w, i) in skeletonWidths" :key="i" class="skeleton skeleton-line" :style="{ width: w }" />
        </div>
      </div>
    </template>

    <!-- Content -->
    <template v-else-if="note">
      <div class="detail-card flat-card">
        <!-- Header -->
        <div class="detail-header">
          <h2 class="note-title">{{ note.title }}</h2>
          <div class="header-actions">
            <el-button @click="router.push(`/note/edit/${note.id}`)">
              <el-icon><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></el-icon>
              编辑
            </el-button>
            <el-button @click="exportNote(note.id, note.title)">
              <el-icon><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg></el-icon>
              导出MD
            </el-button>
            <el-button @click="exportNotePdf(note.id, note.title)">
              <el-icon><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></el-icon>
              导出PDF
            </el-button>
            <el-button @click="router.back()">
              <el-icon><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></el-icon>
              返回
            </el-button>
          </div>
        </div>

        <!-- Meta -->
        <div class="detail-meta">
          <span v-if="categoryName" class="meta-item">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
            {{ categoryName }}
          </span>
          <span class="meta-item">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            {{ note.createTime }}
          </span>
          <span class="meta-item">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            {{ note.updateTime }}
          </span>
        </div>

        <!-- Tags -->
        <div class="detail-tags" v-if="tags.length">
          <el-tag v-for="t in tags" :key="t.id" size="default" class="detail-tag">{{ t.name }}</el-tag>
        </div>

        <!-- Content -->
        <div class="detail-content markdown-body" v-html="contentHtml" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.note-detail {
  max-width: 900px;
  margin: 0 auto;
}

/* Skeleton */
.detail-skeleton {
  padding: 32px;
}
.skeleton-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.skeleton-meta {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
}
.skeleton-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.skeleton-line {
  height: 16px;
  border-radius: 4px;
}

/* Detail card */
.detail-card {
  background: var(--color-bg-white);
  padding: 32px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.note-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.3;
}
.header-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* Meta */
.detail-meta {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.meta-item {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--color-text-muted);
  font-size: 13px;
}

/* Tags */
.detail-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--color-border-light);
}
.detail-tag {
  font-size: 13px;
  cursor: default;
}

/* Content */
.detail-content {
  background: var(--color-bg-gray);
  padding: 24px 32px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
  min-height: 200px;
}
</style>
