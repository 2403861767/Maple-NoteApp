<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Fold, Expand, User, SwitchButton } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const user = ref(JSON.parse(localStorage.getItem('user') || '{}'))

const isCollapse = ref(false)
const darkMode = ref(document.documentElement.classList.contains('dark'))
const mobileMenuOpen = ref(false)

function toggleTheme() {
  darkMode.value = !darkMode.value
  document.documentElement.classList.toggle('dark', darkMode.value)
  localStorage.setItem('theme', darkMode.value ? 'dark' : 'light')
}

watch(darkMode, (val) => {
  document.documentElement.classList.toggle('dark', val)
})

function navigateTo(path) {
  router.push(path)
  mobileMenuOpen.value = false
}

const menuItems = computed(() => {
  const items = [
    { path: '/home', title: '首页', icon: 'HomeFilled' },
    { path: '/notes', title: '我的笔记', icon: 'Document' },
    { path: '/categories', title: '我的分类', icon: 'Folder' },
    { path: '/tags', title: '我的标签', icon: 'CollectionTag' },
    { path: '/profile', title: '个人主页', icon: 'User' },
  ]
  if (user.value.role === 'admin') {
    items.push(
      { type: 'divider' },
      { path: '/admin/users', title: '用户管理', icon: 'Setting' },
      { path: '/admin/notes', title: '笔记管理', icon: 'DocumentChecked' },
      { path: '/admin/categories', title: '分类管理', icon: 'Folder' },
      { path: '/admin/tags', title: '标签管理', icon: 'CollectionTag' },
    )
  }
  return items
})

const activeMenu = computed(() => {
  const path = route.path
  if (path.startsWith('/note/')) return '/notes'
  return path
})

const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/login')
}
</script>

<template>
  <el-container class="layout">
    <!-- Desktop Sidebar — hidden on mobile via CSS -->
    <el-aside :width="isCollapse ? '64px' : '220px'" class="sidebar">
      <!-- Brand -->
      <div class="brand" @click="router.push('/home')">
        <svg class="brand-icon" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2 L2 7 L12 12 L22 7 Z" />
          <path d="M2 17 L12 22 L22 17" />
          <path d="M2 12 L12 17 L22 12" />
        </svg>
        <span v-show="!isCollapse" class="brand-text">枫叶笔记</span>
        <el-tooltip :content="isCollapse ? '展开菜单' : '收起菜单'" placement="right">
          <div class="collapse-toggle" @click.stop="isCollapse = !isCollapse">
            <el-icon :size="18">
              <Fold v-if="!isCollapse" />
              <Expand v-else />
            </el-icon>
          </div>
        </el-tooltip>
      </div>

      <!-- Navigation -->
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        router
        background-color="transparent"
        text-color="var(--sidebar-text)"
        active-text-color="var(--sidebar-active)"
        class="sidebar-menu"
      >
        <template v-for="item in menuItems" :key="item.path || item.title">
          <div v-if="item.type === 'divider'" class="menu-divider" />
          <el-menu-item v-else :index="item.path">
            <el-icon><component :is="item.icon" /></el-icon>
            <template #title>{{ item.title }}</template>
          </el-menu-item>
        </template>
      </el-menu>

    </el-aside>

    <!-- Main area -->
    <el-container class="main-area">
      <!-- Topbar -->
      <el-header class="topbar" height="56px">
        <div class="topbar-left">
          <!-- Hamburger — visible only on mobile -->
          <button class="hamburger-btn" @click="mobileMenuOpen = true" aria-label="打开菜单">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M3 12h18M3 6h18M3 18h18"/>
            </svg>
          </button>
          <span class="page-title">{{ route.meta.title || '' }}</span>
        </div>
        <div class="topbar-center">
          <el-tooltip :content="darkMode ? '切换到亮色模式' : '切换到暗色模式'" placement="bottom">
            <button class="theme-toggle-btn" @click="toggleTheme" :aria-label="darkMode ? '切换到亮色模式' : '切换到暗色模式'">
              <!-- Sun icon -->
              <svg v-if="darkMode" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
              <!-- Moon icon -->
              <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
              </svg>
            </button>
          </el-tooltip>
        </div>
        <div class="topbar-right">
          <div class="user-dropdown">
            <el-avatar :size="32" class="user-avatar" @click="router.push('/profile')">
              <template v-if="user.avatarUrl">
                <img :src="user.avatarUrl" :alt="user.nickname" style="width:100%;height:100%;object-fit:cover" />
              </template>
              <el-icon v-else><User /></el-icon>
            </el-avatar>
            <span class="user-name" @click="router.push('/profile')">{{ user.nickname || user.username }}</span>
            <el-button text class="logout-btn" @click="handleLogout">退出</el-button>
          </div>
        </div>
      </el-header>

      <!-- Content -->
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>

    <!-- Mobile drawer menu -->
    <el-drawer
      v-model="mobileMenuOpen"
      direction="ltr"
      size="280px"
      :with-header="false"
      :close-on-click-modal="true"
      class="mobile-drawer"
    >
      <div class="drawer-brand" @click="navigateTo('/home')">
        <svg class="brand-icon" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="var(--color-primary)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2 L2 7 L12 12 L22 7 Z" />
          <path d="M2 17 L12 22 L22 17" />
          <path d="M2 12 L12 17 L22 12" />
        </svg>
        <span class="brand-text">枫叶笔记</span>
      </div>

      <nav class="drawer-nav">
        <template v-for="item in menuItems" :key="item.path || item.title">
          <div v-if="item.type === 'divider'" class="drawer-divider" />
          <button
            v-else
            class="drawer-item"
            :class="{ active: activeMenu === item.path }"
            @click="navigateTo(item.path)"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.title }}</span>
          </button>
        </template>
      </nav>
      <div class="drawer-footer">
        <button class="drawer-item logout-item" @click="handleLogout">
          <el-icon><SwitchButton /></el-icon>
          <span>退出登录</span>
        </button>
      </div>
    </el-drawer>
  </el-container>
</template>

<style scoped>
.layout {
  height: 100vh;
  overflow: hidden;
}

/* ---- Sidebar (Desktop) ---- */
.sidebar {
  background: var(--sidebar-bg);
  display: flex;
  flex-direction: column;
  transition: width var(--transition-slow);
  overflow: hidden;
  border-right: 1px solid rgba(0, 0, 0, 0.06);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 56px;
  padding: 0 12px 0 18px;
  color: var(--color-text);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  transition: background var(--transition-fast);
  flex-shrink: 0;
}
.brand:hover {
  background: rgba(0, 0, 0, 0.03);
}
.brand-icon {
  flex-shrink: 0;
  color: var(--color-primary);
  cursor: pointer;
}
.brand-text {
  font-size: 17px;
  font-weight: 700;
  white-space: nowrap;
  letter-spacing: 0.5px;
  cursor: pointer;
}
.collapse-toggle {
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  color: var(--sidebar-text);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
  flex-shrink: 0;
}
.collapse-toggle:hover {
  background: var(--sidebar-hover);
  color: var(--color-primary);
}

/* Override Element Plus menu in sidebar */
.sidebar-menu {
  flex: 1;
  border-right: none !important;
  padding-top: 8px;
}
.sidebar-menu :deep(.el-menu-item) {
  margin: 2px 8px;
  border-radius: var(--radius-md);
  height: 44px;
  line-height: 44px;
  transition: background var(--transition-fast), color var(--transition-fast);
}
.sidebar-menu :deep(.el-menu-item:hover) {
  background: var(--sidebar-hover) !important;
}
.sidebar-menu :deep(.el-menu-item.is-active) {
  background: rgba(13, 148, 136, 0.1) !important;
  color: var(--sidebar-active) !important;
  font-weight: 600;
}

.menu-divider {
  height: 1px;
  background: rgba(0, 0, 0, 0.06);
  margin: 8px 16px;
}


/* ---- Topbar ---- */
.main-area {
  flex-direction: column;
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: var(--color-bg-white);
  border-bottom: 1px solid var(--color-border-light);
  flex-shrink: 0;
}
.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.topbar-center {
  display: flex;
  align-items: center;
}
.theme-toggle-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  background: var(--color-bg-gray);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
}
.theme-toggle-btn:hover {
  background: var(--color-border-light);
  color: var(--color-primary);
  border-color: var(--color-primary-light);
}
.page-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}
.topbar-right {
  display: flex;
  align-items: center;
}
.user-dropdown {
  display: flex;
  align-items: center;
  gap: 10px;
}
.user-avatar {
  background: var(--color-primary-100);
  color: var(--color-primary);
  cursor: pointer;
  transition: box-shadow var(--transition-fast);
}
.user-avatar:hover {
  box-shadow: 0 0 0 3px var(--color-primary-100);
}
.user-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  cursor: pointer;
}
.user-name:hover {
  color: var(--color-primary);
}
.logout-btn {
  color: var(--color-text-muted);
  font-size: 13px;
  transition: color var(--transition-fast);
}
.logout-btn:hover {
  color: var(--color-danger);
}

/* ---- Hamburger button (mobile only) ---- */
.hamburger-btn {
  display: none;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: var(--radius-md);
  color: var(--color-text);
  cursor: pointer;
  transition: background var(--transition-fast);
  flex-shrink: 0;
}
.hamburger-btn:hover {
  background: var(--color-border-light);
}

/* ---- Content ---- */
.main-content {
  background: var(--color-bg);
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

/* ---- Mobile drawer ---- */
.mobile-drawer :deep(.el-drawer__body) {
  display: flex;
  flex-direction: column;
}
.drawer-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 20px 16px;
  border-bottom: 1px solid var(--color-border-light);
  cursor: pointer;
  color: var(--color-text);
}
.drawer-brand .brand-text {
  font-size: 18px;
  font-weight: 700;
}
.drawer-nav {
  padding: 8px 0;
  display: flex;
  flex-direction: column;
}
.drawer-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 20px;
  border: none;
  background: transparent;
  color: var(--sidebar-text);
  font-size: 15px;
  font-family: var(--font-family);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
  text-align: left;
}
.drawer-item:hover {
  background: var(--sidebar-hover);
}
.drawer-item.active {
  background: rgba(13, 148, 136, 0.1);
  color: var(--sidebar-active);
  font-weight: 600;
}
.drawer-divider {
  height: 1px;
  background: var(--color-border-light);
  margin: 4px 20px;
}
.drawer-footer {
  margin-top: auto;
  border-top: 1px solid var(--color-border-light);
  padding: 8px 0;
}
.logout-item {
  color: var(--el-color-danger) !important;
}
.logout-item:hover {
  background: rgba(245, 108, 108, 0.08) !important;
}

/* ======================================== */
/* ===== Mobile: max-width 768px ===== */
/* ======================================== */
@media (max-width: 768px) {
  /* Hide desktop sidebar */
  .sidebar {
    display: none;
  }

  /* Show hamburger */
  .hamburger-btn {
    display: flex;
  }

  /* Compact topbar */
  .topbar {
    padding: 0 12px;
  }

  /* Hide username, keep avatar only */
  .user-name {
    display: none;
  }
  .logout-btn {
    display: none;
  }
  .user-dropdown {
    gap: 0;
  }

  /* Tighter content padding */
  .main-content {
    padding: 12px;
  }
}
</style>
