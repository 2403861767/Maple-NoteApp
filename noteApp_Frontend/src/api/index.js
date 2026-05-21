import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '../router'

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// 请求拦截器 — 自动带 Token
request.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器 — 统一错误处理
request.interceptors.response.use(
  response => {
    const res = response.data
    if (res.code !== 0) {
      // 未登录（token 过期/无效）→ 清除状态跳转登录页
      if (res.code === 40002) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.push('/login')
        return Promise.reject(new Error(res.message))
      }
      ElMessage.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message))
    }
    return res
  },
  error => {
    const status = error.response?.status
    if (status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
    } else if (status === 403) {
      // 403 表示已登录但无权限，不应强制登出
      const msg = error.response?.data?.message || '没有权限访问'
      ElMessage.error(msg)
    } else {
      ElMessage.error('网络异常，请稍后重试')
    }
    return Promise.reject(error)
  }
)

export default request
