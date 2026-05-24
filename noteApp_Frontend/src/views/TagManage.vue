<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getTagList, createTag, updateTag, deleteTag } from '../api/tag'

const tags = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const loading = ref(false)

const form = reactive({ id: null, name: '' })

const fetchTags = async () => {
  loading.value = true
  try {
    const res = await getTagList()
    tags.value = res.data || []
  } finally {
    loading.value = false
  }
}

const handleCreate = () => {
  isEdit.value = false
  form.id = null
  form.name = ''
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  form.id = row.id
  form.name = row.name
  dialogVisible.value = true
}

const handleDelete = async (id) => {
  try {
    await deleteTag(id)
    fetchTags()
  } catch {}
}

const handleSave = async () => {
  if (!form.name.trim()) {
    ElMessage.warning('请输入标签名称')
    return
  }
  try {
    if (isEdit.value) {
      await updateTag(form)
    } else {
      await createTag({ name: form.name })
    }
    dialogVisible.value = false
    fetchTags()
  } catch {}
}

onMounted(fetchTags)
</script>

<template>
  <div class="tag-manage">
    <!-- Header bar -->
    <div class="manage-toolbar flat-card">
      <h3 class="manage-title">标签管理</h3>
      <el-button type="primary" size="large" @click="handleCreate">
        <el-icon><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></el-icon>
        新建标签
      </el-button>
    </div>

    <!-- Content -->
    <div class="manage-content flat-card">
      <!-- Loading -->
      <div v-if="loading" class="tag-skeleton">
        <div v-for="i in 8" :key="i" class="skeleton skeleton-tag" :style="{ width: (60 + i * 12) + 'px' }" />
      </div>

      <!-- Empty -->
      <div v-else-if="!loading && tags.length === 0" class="empty-state">
        <svg viewBox="0 0 80 80" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.5">
          <path d="M16 16h20l4 6h24a4 4 0 014 4v28a4 4 0 01-4 4H16a4 4 0 01-4-4V20a4 4 0 014-4z" />
        </svg>
        <span class="empty-title">还没有标签</span>
        <span class="empty-desc">标签让你更灵活地标注和检索笔记</span>
        <el-button type="primary" @click="handleCreate">创建第一个标签</el-button>
      </div>

      <!-- Tag grid -->
      <div v-else class="tag-grid">
        <div
          v-for="tag in tags"
          :key="tag.id"
          class="tag-card"
          @click="handleEdit(tag)"
        >
          <span class="tag-name"># {{ tag.name }}</span>
          <button
            class="tag-close"
            @click.stop="handleDelete(tag.id)"
            type="button"
            aria-label="删除标签"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Dialog -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑标签' : '新建标签'" width="420px" :close-on-click-modal="false">
      <el-form :model="form" label-position="top" class="dialog-form">
        <el-form-item label="标签名称" required>
          <el-input v-model="form.name" placeholder="请输入标签名称" maxlength="20" size="large" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="large" @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" size="large" @click="handleSave">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.tag-manage {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.manage-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
}
.manage-title {
  font-size: 18px;
  font-weight: 600;
}

.manage-content {
  background: var(--color-bg-white);
  padding: 24px;
  min-height: 200px;
}

/* Skeleton */
.tag-skeleton {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.skeleton-tag {
  height: 36px;
  border-radius: 20px;
}

/* Tag grid */
.tag-grid {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.tag-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--color-bg-gray);
  border: 1.5px solid var(--color-border-light);
  border-radius: 8px;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.tag-card:hover {
  border-color: var(--color-primary-light);
  background: var(--color-primary-50);
}
.tag-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

.tag-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  border-radius: 50%;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all var(--transition-fast);
  opacity: 0;
}
.tag-card:hover .tag-close {
  opacity: 1;
}
.tag-close:hover {
  background: var(--color-danger);
  color: var(--color-on-danger);
}

.dialog-form {
  padding-top: 8px;
}

/* ===== Mobile ===== */
@media (max-width: 768px) {
  .manage-toolbar {
    padding: 12px 16px;
    flex-wrap: wrap;
    gap: 8px;
  }
  .manage-toolbar .el-button {
    width: 100%;
  }
  .manage-content {
    padding: 16px;
  }
  .tag-grid {
    gap: 8px;
  }
  .tag-card {
    padding: 10px 14px;
  }
  .tag-close {
    opacity: 1;
  }
}
</style>
