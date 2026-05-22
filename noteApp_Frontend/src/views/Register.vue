<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { User, UserFilled, Lock } from '@element-plus/icons-vue'
import { register } from '../api/user'

const router = useRouter()
const formRef = ref(null)
const form = reactive({ username: '', password: '', checkPassword: '', nickname: '' })

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
  checkPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (value !== form.password) callback(new Error('两次密码不一致'))
        else callback()
      }, trigger: 'blur'
    },
  ],
}
const loading = ref(false)

const handleRegister = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    const res = await register(form)
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('user', JSON.stringify({
      id: res.data.id, username: res.data.username,
      nickname: res.data.nickname, avatarUrl: res.data.avatarUrl,
      role: res.data.role,
    }))
    router.push('/home')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <!-- Background decoration -->
    <div class="auth-bg">
      <div class="bg-shape shape-1" />
      <div class="bg-shape shape-2" />
      <div class="bg-shape shape-3" />
    </div>

    <!-- Card -->
    <div class="auth-card flat-card">
      <div class="auth-brand">
        <svg class="brand-icon" viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="var(--color-primary)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2 L2 7 L12 12 L22 7 Z" />
          <path d="M2 17 L12 22 L22 17" />
          <path d="M2 12 L12 17 L22 12" />
        </svg>
        <h1 class="brand-name">创建账号</h1>
      </div>
      <p class="auth-subtitle">注册枫叶笔记，开启你的知识管理之旅</p>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" size="large">
            <template #prefix><el-icon><User /></el-icon></template>
          </el-input>
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="form.nickname" placeholder="可选，默认同用户名" size="large">
            <template #prefix><el-icon><UserFilled /></el-icon></template>
          </el-input>
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="至少 6 位" show-password size="large">
            <template #prefix><el-icon><Lock /></el-icon></template>
          </el-input>
        </el-form-item>
        <el-form-item label="确认密码" prop="checkPassword">
          <el-input v-model="form.checkPassword" type="password" placeholder="再次输入密码" show-password size="large">
            <template #prefix><el-icon><Lock /></el-icon></template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" class="submit-btn" size="large" @click="handleRegister">
            注 册
          </el-button>
        </el-form-item>
      </el-form>

      <p class="switch-link">
        已有账号？<router-link to="/login">去登录</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-50);
  position: relative;
  overflow: hidden;
}

.auth-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.bg-shape {
  position: absolute;
  border-radius: 50%;
  opacity: 0.12;
}
.shape-1 {
  width: 600px; height: 600px;
  background: var(--color-primary);
  top: -200px; right: -150px;
}
.shape-2 {
  width: 400px; height: 400px;
  background: var(--color-primary-light);
  bottom: -100px; left: -100px;
}
.shape-3 {
  width: 200px; height: 200px;
  background: var(--color-accent);
  top: 50%; left: 10%;
}

.auth-card {
  position: relative;
  width: 420px;
  padding: 40px;
  background: var(--color-bg-white);
}

.auth-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 8px;
}
.brand-name {
  font-size: 26px;
  font-weight: 700;
  color: var(--color-text);
}
.auth-subtitle {
  text-align: center;
  color: var(--color-text-muted);
  margin-bottom: 32px;
  font-size: 14px;
}

.submit-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
  font-weight: 600;
}

.switch-link {
  text-align: center;
  color: var(--color-text-muted);
  font-size: 14px;
  margin-top: -4px;
}
.switch-link a {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 500;
}
.switch-link a:hover {
  color: var(--color-primary-dark);
}

/* ===== Mobile ===== */
@media (max-width: 768px) {
  .auth-card {
    width: min(420px, 90vw);
    padding: 32px 24px;
  }
  .brand-name {
    font-size: 22px;
  }
}
</style>
