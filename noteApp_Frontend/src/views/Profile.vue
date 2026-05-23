<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getCurrentUser, uploadAvatar, updateProfile } from '../api/user'

const router = useRouter()

const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp']

const loading = ref(false)
const uploading = ref(false)
const saving = ref(false)
const user = ref(null)
const fileInput = ref(null)
const previewUrl = ref('')
const nicknameForm = ref({ nickname: '' })

const fetchUser = async () => {
  loading.value = true
  try {
    const res = await getCurrentUser()
    user.value = res.data
    nicknameForm.value.nickname = res.data.nickname || ''
  } finally {
    loading.value = false
  }
}

const triggerUpload = () => {
  fileInput.value.click()
}

const handleFileChange = async (e) => {
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
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.error('头像大小不能超过 2MB')
    e.target.value = ''
    return
  }

  // 本地预览（先释放旧 URL 防止内存泄漏）
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = URL.createObjectURL(file)

  // 上传
  uploading.value = true
  try {
    const res = await uploadAvatar(file)
    user.value.avatarUrl = res.data
    // 更新 localStorage 中的用户信息
    const stored = JSON.parse(localStorage.getItem('user') || '{}')
    stored.avatarUrl = res.data
    localStorage.setItem('user', JSON.stringify(stored))
    ElMessage.success('头像更新成功')
  } catch {
    // axios 拦截器已统一弹窗提示
  } finally {
    uploading.value = false
    e.target.value = ''
  }
}

const handleSaveNickname = async () => {
  if (!nicknameForm.value.nickname.trim()) return
  saving.value = true
  try {
    const res = await updateProfile({ nickname: nicknameForm.value.nickname })
    user.value = res.data
    // 更新 localStorage
    const stored = JSON.parse(localStorage.getItem('user') || '{}')
    stored.nickname = res.data.nickname
    localStorage.setItem('user', JSON.stringify(stored))
    ElMessage.success('昵称更新成功')
  } catch {
    // axios 拦截器已统一弹窗提示
  } finally {
    saving.value = false
  }
}

const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/login')
}

onMounted(fetchUser)

onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})
</script>

<template>
  <div class="profile">
    <!-- Loading skeleton -->
    <template v-if="loading">
      <div class="profile-skeleton flat-card">
        <div class="sk-avatar-row">
          <div class="skeleton sk-circle" />
          <div class="sk-info">
            <div class="skeleton" style="width: 160px; height: 20px" />
            <div class="skeleton" style="width: 100px; height: 14px; margin-top: 8px" />
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="user">
      <!-- Avatar + basic info card -->
      <div class="profile-header flat-card">
        <div class="avatar-section">
          <div class="avatar-wrapper" @click="triggerUpload" :class="{ uploading }">
            <template v-if="user.avatarUrl">
              <img
                :src="previewUrl || user.avatarUrl"
                :alt="user.nickname + '的头像'"
                class="avatar-img"
              />
            </template>
            <template v-else>
              <div class="avatar-placeholder">
                <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            </template>
            <div class="avatar-overlay">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <span>{{ uploading ? '上传中...' : '更换头像' }}</span>
            </div>
          </div>
          <input
            ref="fileInput"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
            style="display:none"
            @change="handleFileChange"
          />
          <div class="avatar-text">
            <h2 class="profile-name">{{ user.nickname || user.username }}</h2>
            <p class="profile-username">@{{ user.username }}</p>
          </div>
        </div>
      </div>

      <!-- Edit nickname card -->
      <div class="profile-section flat-card">
        <h3 class="section-title">编辑资料</h3>
        <div class="form-row">
          <div class="form-field">
            <label class="field-label">昵称</label>
            <div class="field-input-row">
              <el-input
                v-model="nicknameForm.nickname"
                placeholder="输入新昵称"
                maxlength="20"
                show-word-limit
                size="large"
                style="width: 320px"
                @keyup.enter="handleSaveNickname"
              />
              <el-button type="primary" size="large" :loading="saving" @click="handleSaveNickname">
                保存
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- Account info card -->
      <div class="profile-section flat-card">
        <h3 class="section-title">账号信息</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">用户 ID</span>
            <span class="info-value">{{ user.id }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">用户名</span>
            <span class="info-value">{{ user.username }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">注册时间</span>
            <span class="info-value">{{ user.createTime || '-' }}</span>
          </div>
        </div>
      </div>

      <div class="profile-section">
        <el-button type="danger" size="large" style="width: 100%" @click="handleLogout">
          退出登录
        </el-button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.profile {
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Skeleton */
.profile-skeleton {
  padding: 40px;
}
.sk-avatar-row {
  display: flex;
  align-items: center;
  gap: 24px;
}
.sk-circle {
  width: 88px;
  height: 88px;
  border-radius: 50%;
}
.sk-info {
  display: flex;
  flex-direction: column;
}

/* Cards */
.profile-header {
  padding: 36px 40px;
}

/* Avatar section */
.avatar-section {
  display: flex;
  align-items: center;
  gap: 24px;
}
.avatar-wrapper {
  position: relative;
  width: 88px;
  height: 88px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  flex-shrink: 0;
  border: 3px solid var(--color-border-light);
  transition: border-color var(--transition-fast);
}
.avatar-wrapper:hover {
  border-color: var(--color-primary-light);
}
.avatar-wrapper.uploading {
  pointer-events: none;
  opacity: 0.7;
}
.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-50);
  color: var(--color-primary-light);
}
.avatar-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 12px;
  opacity: 0;
  transition: opacity var(--transition-fast);
}
.avatar-wrapper:hover .avatar-overlay {
  opacity: 1;
}

.avatar-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.profile-name {
  font-size: 22px;
  font-weight: 700;
}
.profile-username {
  font-size: 14px;
  color: var(--color-text-muted);
}

/* Section */
.profile-section {
  padding: 24px 32px;
}
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border-light);
}

/* Form */
.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.field-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
}
.field-input-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* Info grid */
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}
.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.info-label {
  font-size: 12px;
  color: var(--color-text-muted);
  font-weight: 500;
}
.info-value {
  font-size: 15px;
  color: var(--color-text);
  font-weight: 500;
}

/* ===== Mobile ===== */
@media (max-width: 768px) {
  .profile-header {
    padding: 24px 20px;
  }
  .avatar-section {
    flex-direction: column;
    align-items: flex-start;
  }
  .avatar-text {
    align-items: flex-start;
  }
  .profile-section {
    padding: 20px;
  }
  .field-input-row {
    flex-direction: column;
  }
  .field-input-row .el-input {
    width: 100% !important;
  }
  .field-input-row .el-button {
    width: 100%;
  }
  .info-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
</style>
