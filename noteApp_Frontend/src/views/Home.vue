<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { queryNotes } from '../api/note'

const router = useRouter()
const user = ref(JSON.parse(localStorage.getItem('user') || '{}'))
const recentNotes = ref([])
const loading = ref(true)
const error = ref(false)

onMounted(async () => {
  try {
    const res = await queryNotes({ pageRequest: { pageNum: 1, pageSize: 5 } })
    recentNotes.value = res.data.noteList || []
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
})

function openNote(id) {
  router.push(`/note/detail/${id}`)
}
</script>

<template>
  <div class="home">
    <!-- Welcome -->
    <div class="welcome">
      <h2 class="welcome-title">你好，{{ user.nickname || user.username }}</h2>
      <p class="welcome-desc">今天想写点什么？</p>
    </div>

    <!-- Primary CTA -->
    <button class="new-note-btn" @click="router.push('/note/create')">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      写笔记
    </button>

    <!-- Recent notes -->
    <div class="recent-section">
      <h3 class="section-title">最近笔记</h3>

      <!-- Error -->
      <p class="recent-hint" v-if="error">加载失败，请稍后重试</p>

      <!-- Loading skeleton -->
      <div v-else-if="loading" class="skeleton-notes">
        <div v-for="i in 3" :key="i" class="skeleton-note">
          <div class="skeleton" style="width: 60%; height: 16px" />
          <div class="skeleton" style="width: 40%; height: 12px; margin-top: 6px" />
        </div>
      </div>

      <!-- No notes yet -->
      <p class="recent-hint" v-else-if="!recentNotes.length">还没有笔记，点击上方按钮开始写吧</p>

      <!-- Has notes -->
      <div class="recent-list" v-else>
        <div
          v-for="note in recentNotes" :key="note.id"
          class="recent-item"
          @click="openNote(note.id)"
        >
          <div class="recent-info">
            <span class="recent-title">{{ note.title }}</span>
            <span class="recent-time">{{ note.updateTime || note.createTime }}</span>
          </div>
          <svg class="recent-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home {
  max-width: 640px;
  margin: 0 auto;
  padding-top: 60px;
}

/* Welcome */
.welcome {
  margin-bottom: 32px;
}
.welcome-title {
  font-size: 26px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 8px;
}
.welcome-desc {
  font-size: 16px;
  color: var(--color-text-muted);
}

/* Primary CTA */
.new-note-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 32px;
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-lg);
  font-size: 17px;
  font-weight: 600;
  font-family: var(--font-family);
  cursor: pointer;
  transition: background var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast);
  box-shadow: 0 2px 8px rgba(13, 148, 136, 0.25);
  margin-bottom: 48px;
}
.new-note-btn:hover {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(13, 148, 136, 0.35);
}
.new-note-btn:active {
  transform: translateY(0);
}

/* Recent notes */
.recent-section {
  margin-top: 8px;
}
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

.recent-hint {
  font-size: 14px;
  color: var(--color-text-muted);
  padding: 16px 0;
}

.skeleton-notes {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.skeleton-note {
  padding: 12px 0;
}

.recent-list {
  display: flex;
  flex-direction: column;
}
.recent-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid var(--color-border-light);
  cursor: pointer;
  transition: padding var(--transition-fast);
}
.recent-item:last-child {
  border-bottom: none;
}
.recent-item:hover {
  padding-left: 8px;
}
.recent-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.recent-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}
.recent-time {
  font-size: 13px;
  color: var(--color-text-muted);
}
.recent-arrow {
  color: var(--color-text-muted);
  opacity: 0;
  transition: opacity var(--transition-fast), transform var(--transition-fast);
  flex-shrink: 0;
}
.recent-item:hover .recent-arrow {
  opacity: 1;
  transform: translateX(4px);
}
</style>
