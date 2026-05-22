<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAdminNotes, adminDeleteNote } from '../api/admin'

const router = useRouter()
const loading = ref(false)
const notes = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)

const searchForm = reactive({ keyword: '', userKeyword: '' })

const fetchNotes = async () => {
  loading.value = true
  try {
    const res = await getAdminNotes({
      keyword: searchForm.keyword || undefined,
      userKeyword: searchForm.userKeyword || undefined,
      pageNum: currentPage.value,
      pageSize: pageSize.value,
    })
    notes.value = res.data.noteList || []
    total.value = res.data.total || 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  fetchNotes()
}

const handleClear = () => handleSearch()

const handlePageChange = () => {
  fetchNotes()
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定删除笔记「${row.title}」？此操作不可恢复。`,
      '确认删除',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  try {
    await adminDeleteNote(row.id)
    ElMessage.success('笔记已删除')
    fetchNotes()
  } catch {
    // axios 拦截器已统一处理
  }
}

onMounted(() => {
  fetchNotes()
})
</script>

<template>
  <div class="admin-notes">
    <div class="page-header flat-card">
      <h3 class="header-title">笔记管理</h3>
      <span class="header-count">共 {{ total }} 篇笔记</span>
    </div>

    <div class="toolbar flat-card">
      <div class="toolbar-left">
        <el-input
          v-model="searchForm.keyword"
          placeholder="搜索标题或内容..."
          clearable
          size="large"
          style="width: 240px"
          @keyup.enter="handleSearch"
          @clear="handleClear"
        />
        <el-input
          v-model="searchForm.userKeyword"
          placeholder="搜索用户昵称或用户名..."
          clearable
          size="large"
          style="width: 240px"
          @keyup.enter="handleSearch"
          @clear="handleClear"
        />
        <el-button type="primary" size="large" @click="handleSearch">搜索</el-button>
      </div>
    </div>

    <div class="table-card flat-card">
      <el-table :data="notes" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="标题" min-width="220">
          <template #default="{ row }">
            <div class="title-cell">
              <span class="note-title">{{ row.title }}</span>
              <div class="title-tags" v-if="row.tagNames?.length">
                <el-tag v-for="name in row.tagNames" :key="name" size="small" class="mini-tag">{{ name }}</el-tag>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="所属用户" width="200">
          <template #default="{ row }">
            <div class="user-cell">
              <span class="user-name">{{ row.nickname || row.username }}</span>
              <span class="user-account">{{ row.username }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="categoryName" label="分类" width="120">
          <template #default="{ row }">
            <span class="category-name">{{ row.categoryName || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="170" />
        <el-table-column prop="updateTime" label="更新时间" width="170" />
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="router.push(`/note/detail/${row.id}`)">查看</el-button>
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
.admin-notes {
  max-width: 1100px;
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

.title-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.note-title { font-weight: 500; }
.title-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.mini-tag { font-size: 12px; }
.category-name { color: var(--color-text-muted); font-size: 13px; }

.user-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.user-name {
  font-weight: 500;
  font-size: 14px;
}
.user-account {
  color: var(--color-text-muted);
  font-size: 12px;
}

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
