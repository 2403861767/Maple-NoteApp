<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAdminTags, adminDeleteTag } from '../api/admin'

const tags = ref([])
const loading = ref(false)
const userKeyword = ref('')
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)

const fetchTags = async () => {
  loading.value = true
  try {
    const res = await getAdminTags({
      userKeyword: userKeyword.value || undefined,
      pageNum: currentPage.value,
      pageSize: pageSize.value,
    })
    tags.value = res.data.tagList || []
    total.value = res.data.total || 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  fetchTags()
}

const handleClear = () => {
  userKeyword.value = ''
  currentPage.value = 1
  fetchTags()
}

const handlePageChange = () => {
  fetchTags()
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定删除标签「${row.name}」？笔记中的该标签关联也会被清除。`,
      '确认删除',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  try {
    await adminDeleteTag(row.id)
    ElMessage.success('标签已删除')
    fetchTags()
  } catch {
    // axios 拦截器已统一处理
  }
}

onMounted(fetchTags)
</script>

<template>
  <div class="admin-tags">
    <div class="page-header flat-card">
      <h3 class="header-title">全部标签</h3>
      <span class="header-count">共 {{ total }} 个标签</span>
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
          <div class="skeleton skeleton-cell" style="width: 160px" />
          <div class="skeleton skeleton-cell" style="width: 100px" />
          <div class="skeleton skeleton-cell" style="width: 160px" />
          <div class="skeleton skeleton-cell" style="width: 100px" />
        </div>
      </div>

      <div v-else-if="!loading && tags.length === 0" class="empty-state">
        <span class="empty-title">暂无标签数据</span>
        <span class="empty-desc">所有用户都还没有创建标签</span>
      </div>

      <el-table v-else :data="tags" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="标签名称" min-width="220">
          <template #default="{ row }">
            <el-tag size="default" type="primary" effect="plain"># {{ row.name }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="username" label="所属用户" width="160" />
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
.admin-tags {
  max-width: 900px;
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
