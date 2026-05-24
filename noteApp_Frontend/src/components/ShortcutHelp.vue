<script setup>
import { computed } from 'vue'
import { useShortcuts, displayShortcut } from '../composables/useShortcuts'

const { helpVisible, shortcutRegistry, isMac } = useShortcuts()

const groups = computed(() => {
  const map = new Map()
  for (const item of shortcutRegistry.value) {
    const cat = item.category || '其他'
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat).push(item)
  }
  return [...map.entries()]
})
</script>

<template>
  <el-dialog
    v-model="helpVisible"
    title="键盘快捷键"
    width="520px"
    :close-on-click-modal="true"
  >
    <div v-for="[category, items] in groups" :key="category" class="shortcut-group">
      <h4 class="group-title">{{ category }}</h4>
      <div v-for="item in items" :key="item.shortcut" class="shortcut-row">
        <kbd class="shortcut-keys">{{ displayShortcut(item.shortcut, isMac) }}</kbd>
        <span class="shortcut-desc">{{ item.description }}</span>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
.shortcut-group {
  margin-bottom: 16px;
}
.shortcut-group:last-child {
  margin-bottom: 0;
}
.group-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--color-border-light);
}
.shortcut-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
}
.shortcut-keys {
  display: inline-block;
  padding: 3px 8px;
  background: var(--color-bg-gray);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text);
  white-space: nowrap;
}
.shortcut-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
}
</style>
