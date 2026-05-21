import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { transition: 'fade' },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue'),
    meta: { transition: 'fade' },
  },
  {
    path: '/',
    component: () => import('../views/Layout.vue'),
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('../views/Home.vue'),
        meta: { title: '首页' },
      },
      {
        path: 'notes',
        name: 'NoteList',
        component: () => import('../views/NoteList.vue'),
        meta: { title: '笔记列表' },
      },
      {
        path: 'note/create',
        name: 'NoteCreate',
        component: () => import('../views/NoteEdit.vue'),
        meta: { title: '新建笔记' },
      },
      {
        path: 'note/detail/:id',
        name: 'NoteDetail',
        component: () => import('../views/NoteDetail.vue'),
        meta: { title: '笔记详情' },
      },
      {
        path: 'note/edit/:id',
        name: 'NoteEdit',
        component: () => import('../views/NoteEdit.vue'),
        meta: { title: '编辑笔记' },
      },
      {
        path: 'categories',
        name: 'CategoryManage',
        component: () => import('../views/CategoryManage.vue'),
        meta: { title: '我的分类' },
      },
      {
        path: 'tags',
        name: 'TagManage',
        component: () => import('../views/TagManage.vue'),
        meta: { title: '我的标签' },
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('../views/Profile.vue'),
        meta: { title: '个人主页' },
      },
      {
        path: 'admin/users',
        name: 'AdminUsers',
        component: () => import('../views/AdminUsers.vue'),
        meta: { title: '用户管理', requiresAdmin: true },
      },
      {
        path: 'admin/notes',
        name: 'AdminNotes',
        component: () => import('../views/AdminNotes.vue'),
        meta: { title: '笔记管理', requiresAdmin: true },
      },
      {
        path: 'admin/categories',
        name: 'AdminCategories',
        component: () => import('../views/AdminCategories.vue'),
        meta: { title: '全部分类', requiresAdmin: true },
      },
      {
        path: 'admin/tags',
        name: 'AdminTags',
        component: () => import('../views/AdminTags.vue'),
        meta: { title: '全部标签', requiresAdmin: true },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const token = localStorage.getItem('token')
  const isAuthPage = to.path === '/login' || to.path === '/register'

  if (isAuthPage) {
    return token ? '/home' : undefined
  }
  if (!token) return '/login'

  if (to.meta.requiresAdmin) {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (user.role !== 'admin') return '/home'
  }
})

export default router
