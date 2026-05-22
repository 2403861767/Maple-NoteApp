<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAdminUsers, disableUser, enableUser } from '../api/admin'

const loading = ref(false)
const users = ref([])
const currentUserId = ref(null)
const userKeyword = ref('')

const fetchUsers = async () => {
  loading.value = true
  try {
    const res = await getAdminUsers({ userKeyword: userKeyword.value || undefined })
    users.value = res.data || []
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  fetchUsers()
}

const handleClear = () => {
  userKeyword.value = ''
  fetchUsers()
}

const handleDisable = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要禁用用户 "${row.username}" 吗？禁用后该用户将无法登录。`,
      '确认禁用',
      { confirmButtonText: '确定禁用', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  try {
    await disableUser(row.id)
    ElMessage.success(`用户 "${row.username}" 已禁用`)
    await fetchUsers()
  } catch {
    // axios 拦截器已统一处理
  }
}

const handleEnable = async (row) => {
  try {
    await enableUser(row.id)
    ElMessage.success(`用户 "${row.username}" 已启用`)
    await fetchUsers()
  } catch {
    // axios 拦截器已统一处理
  }
}

onMounted(() => {
  const stored = JSON.parse(localStorage.getItem('user') || '{}')
  currentUserId.value = stored.id
  fetchUsers()
})
</script>

<template>
  <div class="admin-users">
    <div class="page-header flat-card">
      <h3 class="header-title">用户管理</h3>
      <span class="header-count">共 {{ users.length }} 个用户</span>
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
      <el-table :data="users" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="username" label="用户名" min-width="120" />
        <el-table-column prop="nickname" label="昵称" min-width="120" />
        <el-table-column prop="role" label="角色" width="90">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : 'info'" size="small" effect="plain">
              {{ row.role === 'admin' ? '管理员' : '用户' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="noteCount" label="笔记数" width="80" align="center" />
        <el-table-column prop="enabled" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'danger'" size="small" effect="plain">
              {{ row.enabled ? '正常' : '已禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="注册时间" width="170" />
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <div class="action-row">
              <el-button
                v-if="row.enabled"
                text type="danger" size="small"
                :disabled="row.id === currentUserId"
                @click="handleDisable(row)"
              >
                禁用
              </el-button>
              <el-button
                v-else
                text type="success" size="small"
                @click="handleEnable(row)"
              >
                启用
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.admin-users {
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

.action-row {
  display: flex;
  gap: 4px;
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
}
</style>
