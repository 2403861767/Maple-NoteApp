<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { getCategoryTree, createCategory, updateCategory, deleteCategory } from '../api/category'

const categories = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const loading = ref(false)

const form = reactive({ id: null, name: '', parentId: null, sortOrder: 0 })
const parentOptions = ref([])

const buildParentOptions = (list, excludeId = null, prefix = '') => {
  let result = []
  for (const item of list) {
    if (item.id !== excludeId) {
      result.push({ value: item.id, label: prefix + item.name })
      if (item.children?.length) {
        result = result.concat(buildParentOptions(item.children, excludeId, prefix + '  '))
      }
    }
  }
  return result
}

const fetchCategories = async () => {
  loading.value = true
  try {
    const res = await getCategoryTree()
    categories.value = res.data || []
  } finally {
    loading.value = false
  }
}

const handleCreate = () => {
  isEdit.value = false
  form.id = null
  form.name = ''
  form.parentId = null
  form.sortOrder = 0
  parentOptions.value = [{ value: null, label: '顶级分类' }, ...buildParentOptions(categories.value)]
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  form.id = row.id
  form.name = row.name
  form.parentId = row.parentId
  form.sortOrder = row.sortOrder
  parentOptions.value = [{ value: null, label: '顶级分类' }, ...buildParentOptions(categories.value, row.id)]
  dialogVisible.value = true
}

const handleDelete = async (id) => {
  try {
    await deleteCategory(id)
    fetchCategories()
  } catch {}
}

const handleSave = async () => {
  if (!form.name.trim()) {
    ElMessage.warning('请输入分类名称')
    return
  }
  try {
    if (isEdit.value) {
      await updateCategory(form)
    } else {
      await createCategory({ name: form.name, parentId: form.parentId, sortOrder: form.sortOrder })
    }
    dialogVisible.value = false
    fetchCategories()
  } catch {}
}

const collapsedMap = reactive({})

const toggleExpand = (id) => {
  if (collapsedMap[id]) {
    delete collapsedMap[id]
  } else {
    collapsedMap[id] = true
  }
}

const flatData = computed(() => {
  const result = []
  const walk = (list, depth = 0) => {
    if (!list?.length) return
    for (const item of list) {
      const hasChildren = !!item.children?.length
      const node = { ...item, _depth: depth, _hasChildren: hasChildren }
      const savedChildren = node.children
      delete node.children
      result.push(node)
      if (hasChildren && !collapsedMap[item.id]) {
        walk(savedChildren, depth + 1)
      }
    }
  }
  walk(categories.value)
  return result
})

onMounted(fetchCategories)
</script>

<template>
  <div class="category-manage">
    <!-- Header bar -->
    <div class="manage-toolbar flat-card">
      <h3 class="manage-title">分类管理</h3>
      <el-button type="primary" size="large" @click="handleCreate">
        <el-icon><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></el-icon>
        新建分类
      </el-button>
    </div>

    <!-- Content card -->
    <div class="manage-content flat-card">
      <!-- Loading -->
      <div v-if="loading" class="skeleton-table">
        <div v-for="i in 6" :key="i" class="skeleton-row">
          <div class="skeleton skeleton-cell" style="width: 60px" />
          <div class="skeleton skeleton-cell" style="width: 200px" />
          <div class="skeleton skeleton-cell" style="width: 80px" />
          <div class="skeleton skeleton-cell" style="width: 160px" />
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="!loading && flatData.length === 0" class="empty-state">
        <svg viewBox="0 0 80 80" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.5">
          <path d="M16 16h20l4 6h24a4 4 0 014 4v28a4 4 0 01-4 4H16a4 4 0 01-4-4V20a4 4 0 014-4z" />
        </svg>
        <span class="empty-title">还没有分类</span>
        <span class="empty-desc">创建分类来组织你的笔记知识体系</span>
        <el-button type="primary" @click="handleCreate">创建第一个分类</el-button>
      </div>

      <!-- Table -->
      <el-table v-else :data="flatData">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="分类名称" min-width="240">
          <template #default="{ row }">
            <span class="cat-name" :style="{ paddingLeft: row._depth * 24 + 'px' }">
              <span v-if="row._hasChildren" class="tree-toggle" @click="toggleExpand(row.id)">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" :class="{ collapsed: collapsedMap[row.id] }"><path d="M8 4l8 8-8 8"/></svg>
              </span>
              <span v-else class="tree-toggle tree-toggle--ghost" />
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" class="cat-icon"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
              {{ row.name }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="sortOrder" label="排序" width="100" />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-popconfirm title="删除此分类会同时删除子分类，确认？" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button text type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Dialog -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑分类' : '新建分类'" width="480px" :close-on-click-modal="false">
      <el-form :model="form" label-position="top" class="dialog-form">
        <el-form-item label="分类名称" required>
          <el-input v-model="form.name" placeholder="请输入分类名称" maxlength="20" size="large" />
        </el-form-item>
        <el-form-item label="父分类">
          <el-select v-model="form.parentId" placeholder="顶级分类" style="width: 100%" size="large">
            <el-option v-for="opt in parentOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sortOrder" :min="0" size="large" />
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
.category-manage {
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
  padding: 0;
  overflow: hidden;
}

.cat-name {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cat-icon { flex-shrink: 0; }

.tree-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  cursor: pointer;
  flex-shrink: 0;
  color: var(--color-text-muted);
  border-radius: var(--radius-sm);
}
.tree-toggle:hover {
  color: var(--color-text-primary);
  background: var(--color-fill-hover);
}
.tree-toggle svg {
  transform: rotate(90deg);
  transition: transform 0.15s;
}
.tree-toggle svg.collapsed {
  transform: rotate(0deg);
}
.tree-toggle--ghost {
  visibility: hidden;
}

.manage-content :deep(.el-table th) {
  font-weight: 600;
  color: var(--color-text-secondary);
}
.manage-content :deep(.el-table__body tr:hover > td) {
  background: var(--color-primary-50);
}

.dialog-form {
  padding-top: 8px;
}

.skeleton-table {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.skeleton-row {
  display: flex;
  gap: 20px;
}
.skeleton-cell {
  height: 20px;
  border-radius: var(--radius-sm);
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
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}
</style>
