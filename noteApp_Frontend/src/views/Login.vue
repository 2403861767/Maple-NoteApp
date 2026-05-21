<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock } from '@element-plus/icons-vue'
import { login } from '../api/user'

const router = useRouter()
const formRef = ref(null)
const form = reactive({ username: '', password: '' })
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}
const loading = ref(false)

const handleLogin = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    const res = await login(form)
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
      <!-- Brand -->
      <div class="auth-brand">
        <svg class="brand-icon" viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="var(--color-primary)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2 L2 7 L12 12 L22 7 Z" />
          <path d="M2 17 L12 22 L22 17" />
          <path d="M2 12 L12 17 L22 12" />
        </svg>
        <h1 class="brand-name">枫叶笔记</h1>
      </div>
      <p class="auth-subtitle">登录你的账号，继续记录思考</p>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @keyup.enter="handleLogin">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" size="large">
            <template #prefix><el-icon><User /></el-icon></template>
          </el-input>
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password size="large">
            <template #prefix><el-icon><Lock /></el-icon></template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" class="submit-btn" size="large" @click="handleLogin">
            登 录
          </el-button>
        </el-form-item>
      </el-form>

      <p class="switch-link">
        还没有账号？<router-link to="/register">立即注册</router-link>
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

/* Decorative background shapes */
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
  width: 400px;
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
</style>
