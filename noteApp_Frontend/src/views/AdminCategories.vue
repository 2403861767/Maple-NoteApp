<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAdminCategories, adminDeleteCategory } from '../api/admin'

const categories = ref([])
const loading = ref(false)
const userKeyword = ref('')
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)

const collapsedMap = reactive({})

const toggleExpand = (id) => {
  if (collapsedMap[id]) {
    delete collapsedMap[id]
  } else {
    collapsedMap[id] = true
  }
}

const tableData = computed(() => {
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

const fetchCategories = async () => {
  loading.value = true
  try {
    const res = await getAdminCategories({
      userKeyword: userKeyword.value || undefined,
      pageNum: currentPage.value,
      pageSize: pageSize.value,
    })
    categories.value = res.data.categoryList || []
    total.value = res.data.total || 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  fetchCategories()
}

const handleClear = () => {
  userKeyword.value = ''
  currentPage.value = 1
  fetchCategories()
}

const handlePageChange = () => {
  fetchCategories()
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定删除分类「${row.name}」？子分类也会被递归删除，此操作不可恢复。`,
      '确认删除',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  try {
    await adminDeleteCategory(row.id)
    ElMessage.success('分类已删除')
    fetchCategories()
  } catch {
    // axios 拦截器已统一处理
  }
}

onMounted(fetchCategories)
</script>

<template>
  <div class="admin-categories">
    <div class="page-header flat-card">
      <h3 class="header-title">全部分类</h3>
      <span class="header-count">共 {{ total }} 个一级分类</span>
    </div>

    <div class="toolbar flat-card">
      <div class="toolbar-left">
        <el-input
          v-model="userKeyword"
          placeholder="搜索用户昵称或用户名..."
          clearable
          size="large"
          style="width: 260px"
          @keyup.enter="handleSearch"
          @clear="handleClear"
        />
        <el-button type="primary" size="large" @click="handleSearch">搜索</el-button>
      </div>
    </div>

    <div class="table-card flat-card">
      <div v-if="loading" class="skeleton-table">
        <div v-for="i in 5" :key="i" class="skeleton-row">
          <div class="skeleton skeleton-cell" style="width: 60px" />
          <div class="skeleton skeleton-cell" style="width: 180px" />
          <div class="skeleton skeleton-cell" style="width: 100px" />
          <div class="skeleton skeleton-cell" style="width: 80px" />
          <div class="skeleton skeleton-cell" style="width: 160px" />
        </div>
      </div>

      <div v-else-if="!loading && categories.length === 0" class="empty-state">
        <span class="empty-title">暂无分类数据</span>
        <span class="empty-desc">所有用户都还没有创建分类</span>
      </div>

      <el-table v-else :data="tableData" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="分类名称" min-width="220">
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
        <el-table-column prop="username" label="所属用户" width="140" />
        <el-table-column prop="sortOrder" label="排序" width="80" />
        <el-table-column prop="createTime" label="创建时间" width="170" />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button text type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap" v-if="total > pageSize">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-categories {
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
}
.header-title { font-size: 18px; font-weight: 600; }
.header-count { font-size: 13px; color: var(--color-text-muted); }

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.table-card {
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

.table-card :deep(.el-table th) {
  font-weight: 600;
  color: var(--color-text-secondary);
}
.table-card :deep(.el-table__body tr:hover > td) {
  background: var(--color-primary-50);
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

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 60px 24px;
}
.empty-title { font-size: 16px; font-weight: 500; color: var(--color-text-secondary); }
.empty-desc { font-size: 13px; color: var(--color-text-muted); }

.pagination-wrap {
  display: flex;
  justify-content: center;
  padding: 20px;
}

/* ===== Mobile ===== */
@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    gap: 12px;
    padding: 12px 16px;
  }
  .toolbar-left {
    flex-direction: column;
    width: 100%;
  }
  .toolbar-left .el-input {
    width: 100% !important;
  }
  .toolbar-left .el-button {
    width: 100%;
  }
  .table-card {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .page-header {
    padding: 12px 16px;
  }
  .pagination-wrap {
    padding: 12px;
  }
}
</style>
