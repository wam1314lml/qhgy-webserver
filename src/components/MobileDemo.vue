<template>
  <div class="mobile-demo">
    <div class="mobile-frame">
      <div class="mobile-screen">
        <PageTransition :page-key="activeTab" direction="left">
          <component :is="currentPage" v-bind="pageProps" />
        </PageTransition>
      </div>
      <BottomNavBar :active-tab="activeTab" @tab-change="setActiveTab" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import BottomNavBar from './BottomNavBar.vue'
import ScriptConfig from './ScriptConfig.vue'
import RechargePage from './RechargePage.vue'
import PageTransition from './PageTransition.vue'

// 模拟用户数据
const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  role: 'user',
  points: 100,
  invite_code: 'ABC123',
  total_invites: 5,
}

const mockToken = 'mock-token-123'

const activeTab = ref<'profile' | 'support'>('profile')

const setActiveTab = (tab: 'profile' | 'support') => {
  activeTab.value = tab
}

const currentPage = computed(() => {
  switch (activeTab.value) {
    case 'profile':
      return ScriptConfig
    case 'support':
      return RechargePage
    default:
      return ScriptConfig
  }
})

const pageProps = computed(() => {
  const baseProps = {
    user: mockUser,
    token: mockToken,
  }

  if (activeTab.value === 'profile') {
    return {
      ...baseProps,
      onLogout: () => alert('退出登录'),
    }
  }

  return baseProps
})
</script>

<style scoped>
@import './MobileDemo.css';
</style>
