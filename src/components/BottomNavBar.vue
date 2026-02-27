<template>
  <div class="bottom-nav-bar">
    <a-button 
      class="nav-item"
      :class="{ active: activeTab === 'profile' }"
      @click="$emit('tabChange', 'profile')"
    >
      <span class="nav-icon">👤</span>
      <span class="nav-label">个人</span>
    </a-button>
    <a-button 
      class="nav-item"
      :class="{ active: activeTab === 'support' }"
      @click="$emit('tabChange', 'support')"
    >
      <span class="nav-icon">💬</span>
      <span class="nav-label">客服</span>
    </a-button>
  </div>
</template>

<script setup lang="ts">
interface Props {
  activeTab: 'profile' | 'support'
}

defineProps<Props>()

defineEmits<{
  tabChange: [tab: 'profile' | 'support']
}>()
</script>

<style scoped>
@import './BottomNavBar.css';
</style>